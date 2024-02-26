import { Router } from "express";
import { db } from "./../db/connection.js";
import collections from "../db/collections.js";
import { ObjectId } from "mongodb";
import nodemailer from "nodemailer";
import sendMail from "../mail/send.js";
import user from "../helpers/user.js";
import jwt from "jsonwebtoken";
import axios from "axios";
import fs from "fs";
import path from "path";
let router = Router();

const CheckLogged = async (req, res, next) => {
  const token = req.cookies.userToken;

  jwt.verify(token, process.env.JWT_PRIVATE_KEY, async (err, decoded) => {
    if (decoded) {
      let userData = null;

      try {
        userData = await user.checkUserFound(decoded);
      } catch (err) {
        if (err?.notExists) {
          res.clearCookie("userToken");
          next();
        } else {
          res.status(500).json({
            status: 500,
            message: err,
          });
        }
      } finally {
        if (userData) {
          delete userData.pass;
          res.status(208).json({
            status: 208,
            message: "Already Logged",
            data: userData,
          });
        }
      }
    } else {
      next();
    }
  });
};

router.post("/update_profile", async (req, res) => {
  console.log("first");
  const { email, firstName, lastName, profilePicture } = req.body;
  console.log(email, firstName, lastName, profilePicture);
  const done = await db.collection(collections.USER).updateOne(
    { email },
    {
      $set: {
        fName: firstName,
        lName: lastName,
        profilePicture: profilePicture,
      },
    }
  );
  console.log(done);
});

router.get("/checkLogged", CheckLogged, (req, res) => {
  res.status(405).json({
    status: 405,
    message: "Not Logged",
  });
});

router.post("/signup", CheckLogged, async (req, res) => {
  const Continue = async () => {
    let response = null;
    req.body.pending = true;

    try {
      response = await user.signup(req.body);
    } catch (err) {
      if (err?.exists) {
        res.status(400).json({
          status: 400,
          message: err,
        });
      } else {
        res.status(500).json({
          status: 500,
          message: err,
        });
      }
    } finally {
      if (response?.manual) {
        fs.readFile(
          `${path.resolve(path.dirname(""))}/mail/template.html`,
          "utf8",
          (err, html) => {
            if (!err) {
              html = html.replace(
                "[URL]",
                `${process.env.SITE_URL}/signup/pending/${response._id}`
              );
              html = html.replace("[TITLE]", "Verify your email address");
              html = html.replace(
                "[CONTENT]",
                "To continue setting up your GE CoPilot™ account, please verify that this is your email address."
              );
              html = html.replace("[BTN_NAME]", "Verify email address");

              sendMail({
                to: req.body.email,
                subject: `GE CoPilot™ - Verify your email`,
                html,
              });
            } else {
              console.log(err);
            }
          }
        );

        res.status(200).json({
          status: 200,
          message: "Success",
          data: {
            _id: null,
            manual: response.manual || false,
          },
        });
      } else if (response) {
        res.status(200).json({
          status: 200,
          message: "Success",
          data: {
            _id: response._id,
            manual: response.manual || false,
          },
        });
      }
    }
  };

  if (req.body?.manual === false) {
    let response = null;
    try {
      response = await axios.get(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        {
          headers: {
            Authorization: `Bearer ${req.body.token}`,
          },
        }
      );
    } catch (err) {
      res.status(500).json({
        status: 500,
        message: err,
      });
    } finally {
      if (response?.data.email_verified) {
        if (req.body?.email === response?.data.email) {
          Continue();
        } else {
          res.status(422).json({
            status: 422,
            message: "Something Wrong",
          });
        }
      }
    }
  } else if (req.body?.email) {
    if (req.body?.pass.length >= 8) {
      req.body.email = req.body.email.toLowerCase();

      Continue();
    } else {
      res.status(422).json({
        status: 422,
        message: "Password must 8 character",
      });
    }
  } else {
    res.status(422).json({
      status: 422,
      message: "Enter email",
    });
  }
});

router.get("/checkPending", CheckLogged, async (req, res) => {
  const { _id } = req.query;
  let response = null;
  if (_id?.length === 24) {
    try {
      response = await user.checkPending(_id);
    } catch (err) {
      if (err?.status === 422) {
        res.status(422).json({
          status: 422,
          message: err?.text,
        });
      } else if (err?.status === 404) {
        res.status(404).json({
          status: 404,
          message: err?.text,
        });
      } else {
        res.status(500).json({
          status: 500,
          message: err,
        });
      }
    } finally {
      if (response) {
        res.status(200).json({
          status: 200,
          message: "Success",
          data: response,
        });
      }
    }
  } else {
    res.status(404).json({
      status: 404,
      message: "Not found",
    });
  }
});

router.put("/signup-finish", CheckLogged, async (req, res) => {
  let response = null;
  try {
    response = await user.finishSignup(req.body);
  } catch (err) {
    if (err?.status === 422) {
      res.status(422).json({
        status: 422,
        message: "Already Registered",
      });
    } else {
      res.status(500).json({
        status: 500,
        message: err,
      });
    }
  } finally {
    if (response) {
      res.status(200).json({
        status: 200,
        message: "Success",
        data: response,
      });
    }
  }
});

router.get("/login", CheckLogged, async (req, res) => {
  const Continue = async () => {
    let response = null;
    try {
      response = await user.login(req.query);
    } catch (err) {
      if (err?.status === 422) {
        res.status(422).json({
          status: 422,
          message: "Email or password wrong",
        });
      } else {
        res.status(500).json({
          status: 500,
          message: err,
        });
      }
    } finally {
      if (response) {
        res.status(200).json({
          status: 200,
          message: "Success",
          data: response,
        });
      }
    }
  };

  if (req.query?.manual === "false") {
    let response = null;
    try {
      response = await axios.get(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        {
          headers: {
            Authorization: `Bearer ${req.query.token}`,
          },
        }
      );
    } catch (err) {
      res.status(500).json({
        status: 500,
        message: err,
      });
    } finally {
      if (response?.data.email_verified) {
        req.query.email = response?.data.email;
        Continue();
      }
    }
  } else if (req.query?.email && req.query?.pass) {
    req.query.email = req.query.email.toLowerCase();
    Continue();
  } else {
    res.status(422).json({
      status: 422,
      message: "Email or password wrong",
    });
  }
});

router.post("/forgot-request", CheckLogged, async (req, res) => {
  if (req.body?.email) {
    let secret = Math.random().toString(16);
    secret = secret.replace("0.", "");
    let response = null;
    try {
      response = await user.forgotRequest(req.body, secret);
    } catch (err) {
      if (err?.status === 422) {
        res.status(422).json({
          status: 422,
          message: "Email wrong",
        });
      } else {
        res.status(500).json({
          status: 500,
          message: err,
        });
      }
    } finally {
      if (response) {
        fs.readFile(
          `${path.resolve(path.dirname(""))}/mail/template.html`,
          "utf8",
          (err, html) => {
            if (!err) {
              html = html.replace(
                "[URL]",
                `${process.env.SITE_URL}/forgot/set/${response._id}/${response.secret}`
              );
              html = html.replace("[TITLE]", "Reset password");
              html = html.replace(
                "[CONTENT]",
                "A password change has been requested for your account. If this was you, please use the link below to reset your password."
              );
              html = html.replace("[BTN_NAME]", "Reset password");

              sendMail({
                to: req.body.email,
                subject: `Change password for GE CoPilot™`,
                html,
              });
            } else {
              console.log(err);
            }
          }
        );

        res.status(200).json({
          status: 200,
          message: "Success",
        });
      }
    }
  } else {
    res.status(422).json({
      status: 422,
      message: "Email wrong",
    });
  }
});

router.get("/forgot-check", CheckLogged, async (req, res) => {
  if (req.query?.userId && req.query?.secret) {
    let response = null;
    try {
      response = await user.checkForgot(req.query);
    } catch (err) {
      if (err?.status === 404) {
        res.status(404).json({
          status: 404,
          message: "Wrong Verification",
        });
      } else {
        res.status(500).json({
          status: 500,
          message: err,
        });
      }
    } finally {
      if (response) {
        res.status(200).json({
          status: 200,
          message: "Success",
        });
      }
    }
  } else {
    res.status(404).json({
      status: 404,
      message: "Wrong Verification",
    });
  }
});

router.put("/forgot-finish", CheckLogged, async (req, res) => {
  if (req.body?.userId && req.body?.secret) {
    if (
      req.body?.newPass?.length >= 8 &&
      req.body?.reEnter &&
      req.body?.newPass === req.body?.reEnter
    ) {
      let response = null;
      try {
        response = await user.resetPassword(req.body);
      } catch (err) {
        if (err?.status === 404) {
          res.status(404).json({
            status: 404,
            message: "Wrong Verification",
          });
        } else {
          res.status(500).json({
            status: 500,
            message: err,
          });
        }
      } finally {
        if (response) {
          res.status(200).json({
            status: 200,
            message: "Success",
          });
        }
      }
    } else {
      res.status(422).json({
        status: 422,
        message:
          "Password must 8 character and New password and Re Enter password must same",
      });
    }
  } else {
    res.status(404).json({
      status: 404,
      message: "Wrong Verification",
    });
  }
});

router.get("/checkUserLogged", CheckLogged, (req, res) => {
  res.status(405).json({
    status: 405,
    message: "Not Logged User",
  });
});

router.delete("/account", async (req, res) => {
  jwt.verify(
    req.cookies?.userToken,
    process.env.JWT_PRIVATE_KEY,
    async (err, decoded) => {
      if (decoded) {
        let response = null;
        let userData = null;

        try {
          userData = await user.checkUserFound(decoded);
          if (userData) {
            response = await user.deleteUser(userData._id);
          }
        } catch (err) {
          if (err?.notExists) {
            res.clearCookie("userToken").status(405).json({
              status: 405,
              message: err?.text,
            });
          } else {
            res.status(500).json({
              status: 500,
              message: err,
            });
          }
        } finally {
          if (response) {
            res.clearCookie("userToken").status(200).json({
              status: 200,
              message: "Success",
            });
          }
        }
      } else {
        res.status(405).json({
          status: 405,
          message: "Not Logged",
        });
      }
    }
  );
});

router.post("/otp", async (req, res) => {
  if (req.body?.email) {
    let response = null;
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        host: "smtp.gmail.com",
        auth: {
          user: process.env.MAIL_EMAIL,
          pass: process.env.MAIL_SECRET,
        },
      });
      const html = `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>OTP from GE CoPilot™</title>
        </head>
        <body style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;padding: 2rem;height: auto;">
            <main style="background: #FFFFFF;">
                <div>
                    <img src="https://ci3.googleusercontent.com/proxy/RGGaxLm0ifN5YB6SrijKMz6G2lcKMcrApU1aWOvkSRSUclVDoY0yw2_WK4rwbxXMcXE-wpYZqoDcsxiDLS_CKp5IzdMw9toGr0_XwEOG5i4RqySValLO7A=s0-d-e1-ft#https://cdn.openai.com/API/logo-assets/openai-logo-email-header-1.png" width="560" height="168" alt="OpenAI" title="" style="width:140px;height:auto;border:0;line-height:100%;outline:none;text-decoration:none" class="CToWUd" data-bit="iit">
                    <h1 style="color: #202123;font-size: 32px;line-height: 40px;">Your OTP is: ${otp}</h1>
                    <p style="color: #353740;font-size: 16px;line-height: 24px;margin-bottom: 1.8rem;">Use this OTP to proceed with your action.</p>
                </div>
            </main>
        </body>
        </html>`;
      const subject = "Your OTP from GE CoPilot™";

      const options = {
        from: `GE CoPilot™ <${process.env.MAIL_EMAIL}>`,
        to,
        subject,
        html,
      };

      transporter.sendMail(options, (err, info) => {
        if (err) {
          console.error(err);
        } else {
          console.log("Email sent: ", info.response);
          response = "success";
        }
      });
    } catch (err) {
      if (err?.status === 422) {
        res.status(422).json({
          status: 422,
          message: "Email wrong",
        });
      } else {
        res.status(500).json({
          status: 500,
          message: err,
        });
      }
    } finally {
      if (response) {
        res.status(200).json({
          status: 200,
          message: "Success",
        });
      }
    }
  } else {
    res.status(422).json({
      status: 422,
      message: "Email wrong",
    });
  }
});

router.post("/send_otp", async (req, res) => {
  if (req.body?.email) {
    const otp = req.body.otp;
    let response = null;
    try {
      // Create Nodemailer transporter
      const transporter = nodemailer.createTransport({
        service: "Gmail",
        auth: {
          user: process.env.MAIL_EMAIL,
          pass: process.env.MAIL_SECRET,
        },
      });

      // Define email options
      const mailOptions = {
        from: `GE CoPilot™ <${process.env.MAIL_EMAIL}>`, // Sender email address
        to: req.body.email, // Recipient email address
        subject: "Your OTP", // Email subject
        text: `Your OTP is: ${otp}`, // Email body
      };

      // Send email
      response = await transporter.sendMail(mailOptions);
    } catch (err) {
      if (err?.status === 422) {
        return res.status(422).json({
          status: 422,
          message: "Email wrong",
        });
      } else {
        return res.status(500).json({
          status: 500,
          message: err,
        });
      }
    } finally {
      if (response) {
        await db.collection(collections.TEMP).updateOne(
          { email: req.body.email }, // Search criteria
          { $set: { otp: req.body.otp, userId: new ObjectId() } }, // Update or create object with otp
          { upsert: true } // Option to insert if not found
        );
        
        return res.status(200).json({
          status: 200,
          message: "Success",
        });
      }
    }
  } else {
    return res.status(422).json({
      status: 422,
      message: "Email wrong",
    });
  }
});

router.post("/verify_otp", async (req, res) => {
  console.log(req.body?.email, req.body?.otp);
  if (req.body?.email && req.body?.otp) {
    let response = null;
    try {
      response = await db.collection(collections.TEMP).findOne({
        email: req.body.email,
      });
      console.log(response);
    } catch (err) {
      if (err?.status === 422) {
        return res.status(422).json({
          status: 422,
          message: "Email wrong",
        });
      } else {
        return res.status(500).json({
          status: 500,
          message: err,
        });
      }
    } finally {
      console.log(response.otp, req.body.otp)
      if (response.otp == req.body.otp) {
        const user = await db.collection(collections.USER).findOne({
          email: req.body.email,
        });
        await db.collection(collections.TEMP).deleteOne({
          email: req.body.email,
        });
        let token = jwt.sign(
          {
            _id: user._id,
            email: user.email,
          },
          process.env.JWT_PRIVATE_KEY,
          {
            expiresIn: "24h",
          }
        );

        res
          .status(200)
          .cookie("userToken", token, {
            httpOnly: true,
            expires: new Date(Date.now() + 86400000),
          })
          .json({
            status: 200,
            message: "Success",
            data: user,
          });
      } else {
        return res.status(422).json({
          status: 422,
          message: "OTP wrong",
        });
      }
    }
  }
});

router.get("/logout", (req, res) => {
  res.clearCookie("userToken").status(200).json({
    status: 200,
    message: "LogOut",
  });
});

export default router;
