import { db } from "../db/connection.js";
import collections from "../db/collections.js";
import bcrypt from "bcrypt";
import { ObjectId } from "mongodb";
import AWS from "aws-sdk";

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});
export default {
  signup: ({ email, pass, manual, pending }) => {
    return new Promise(async (resolve, reject) => {
      let done = null;

      let userId = new ObjectId().toHexString();

      try {
        let check = await db.collection(collections.USER).findOne({
          email: email,
        });

        if (!check) {
          pass = await bcrypt.hash(pass, 10);

          await db
            .collection(collections.TEMP)
            .createIndex({ email: 1 }, { unique: true });
          await db
            .collection(collections.TEMP)
            .createIndex({ expireAt: 1 }, { expireAfterSeconds: 3600 });
          done = await db.collection(collections.TEMP).insertOne({
            _id: new ObjectId(userId),
            userId: `${userId}_register`,
            email: `${email}_register`,
            register: true,
            pass: pass,
            manual: manual,
            pending: pending,
            expireAt: new Date(),
          });
        }
      } catch (err) {
        if (err?.code === 11000) {
          done = await db
            .collection(collections.TEMP)
            .findOneAndUpdate(
              {
                email: `${email}_register`,
                register: true,
              },
              {
                $set: {
                  pass: pass,
                  manual: manual,
                },
              }
            )
            .catch((err) => {
              reject(err);
            });
        } else if (err?.code === 85) {
          done = await db
            .collection(collections.TEMP)
            .insertOne({
              _id: new ObjectId(userId),
              userId: `${userId}_register`,
              email: `${email}_register`,
              pass: pass,
              manual: manual,
              pending: pending,
              expireAt: new Date(),
            })
            .catch(async (err) => {
              if (err?.code === 11000) {
                done = await db
                  .collection(collections.TEMP)
                  .findOneAndUpdate(
                    {
                      email: `${email}_register`,
                      register: true,
                    },
                    {
                      $set: {
                        pass: pass,
                        manual: manual,
                      },
                    }
                  )
                  .catch((err) => {
                    reject(err);
                  });
              } else {
                reject(err);
              }
            });
        } else {
          reject(err);
        }
      } finally {
        if (done?.value) {
          resolve({ _id: done?.value?._id.toString(), manual });
        } else if (done?.insertedId) {
          resolve({ _id: done?.insertedId?.toString(), manual });
        } else {
          reject({ exists: true, text: "Email already used" });
        }
      }
    });
  },
  checkPending: (_id) => {
    return new Promise(async (resolve, reject) => {
      let data = await db
        .collection(collections.USER)
        .findOne({
          _id: new ObjectId(_id),
        })
        .catch((err) => {
          reject(err);
        });

      if (data) {
        reject({ status: 422, text: "Already registered" });
      } else {
        let check = null;

        try {
          check = await db.collection(collections.TEMP).findOne({
            _id: new ObjectId(_id),
          });
        } catch (err) {
          reject(err);
        } finally {
          if (check) {
            delete check.pass;
            resolve(check);
          } else {
            reject({ status: 404, text: "Not Found" });
          }
        }
      }
    });
  },
  finishSignup: ({ fName, lName, _id }) => {
    return new Promise(async (resolve, reject) => {
      let data = await db
        .collection(collections.TEMP)
        .findOne({
          _id: new ObjectId(_id),
        })
        .catch((err) => {
          reject(err);
        });

      if (data) {
        let { pass, email } = data;
        email = email.replace("_register", "");

        let res = null;
        try {
          await db
            .collection(collections.USER)
            .createIndex({ email: 1 }, { unique: true });
          res = await db.collection(collections.USER).insertOne({
            _id: new ObjectId(_id),
            email: email,
            fName: fName,
            lName: lName,
            pass: pass,
            profile: "",
          });
        } catch (err) {
          if (err?.code === 11000) {
            reject({ status: 422 });
          } else {
            reject(err);
          }
        } finally {
          if (res?.insertedId) {
            await db
              .collection(collections.TEMP)
              .deleteOne({
                _id: new ObjectId(_id),
              })
              .catch((err) => {
                console.log(err);
              });

            resolve(res);
          } else {
            reject({ text: "Something Wrong" });
          }
        }
      } else {
        reject({ text: "Something Wrong" });
      }
    });
  },
  login: ({ email, pass, manual }) => {
    return new Promise(async (resolve, reject) => {
      let user = await db
        .collection(collections.USER)
        .findOne({ email: email })
        .catch((err) => {
          reject(err);
        });

      if (user) {
        if (manual === "false") {
          delete user.pass;
          resolve(user);
        } else {
          let check;
          try {
            check = await bcrypt.compare(pass, user.pass);
          } catch (err) {
            reject(err);
          } finally {
            if (check) {
              delete user.pass;
              resolve(user);
            } else {
              reject({
                status: 422,
              });
            }
          }
        }
      } else {
        reject({
          status: 422,
        });
      }
    });
  },
  forgotRequest: ({ email }, secret) => {
    return new Promise(async (resolve, reject) => {
      let user = await db
        .collection(collections.USER)
        .findOne({ email: email })
        .catch((err) => reject(err));

      if (user) {
        let done = null;

        try {
          await db
            .collection(collections.TEMP)
            .createIndex({ userId: 1 }, { unique: true });
          await db
            .collection(collections.TEMP)
            .createIndex({ expireAt: 1 }, { expireAfterSeconds: 3600 });
          done = await db.collection(collections.TEMP).insertOne({
            userId: user._id.toString(),
            email: email,
            secret: secret,
            expireAt: new Date(),
          });
        } catch (err) {
          if (err?.code === 11000) {
            secret = await db
              .collection(collections.TEMP)
              .findOneAndUpdate(
                {
                  email: email,
                },
                {
                  $set: {
                    userId: user._id.toString(),
                  },
                }
              )
              .catch((err) => {
                reject(err);
              });

            if (secret) {
              secret.value.userId = user._id.toString();
              secret = secret.value;
              done = true;
            }
          } else if (err?.code === 85) {
            done = await db
              .collection(collections.TEMP)
              .insertOne({
                userId: user._id.toString(),
                email: email,
                secret: secret,
                expireAt: new Date(),
              })
              .catch(async (err) => {
                if (err?.code === 11000) {
                  secret = await db
                    .collection(collections.TEMP)
                    .findOneAndUpdate(
                      {
                        email: email,
                      },
                      {
                        $set: {
                          userId: user._id.toString(),
                        },
                      }
                    )
                    .catch((err) => {
                      reject(err);
                    });

                  if (secret) {
                    secret.value.userId = user._id.toString();
                    secret = secret.value;
                    done = true;
                  }
                } else {
                  reject(err);
                }
              });
          } else {
            reject(err);
          }
        } finally {
          if (done) {
            if (typeof secret === "object") {
              resolve({ secret: secret?.secret, _id: user?._id });
            } else {
              resolve({ secret, _id: user?._id });
            }
          }
        }
      } else {
        reject({ status: 422 });
      }
    });
  },
  resetPassword: ({ newPass, userId, secret }) => {
    return new Promise(async (resolve, reject) => {
      let checkSecret = db
        .collection(collections.TEMP)
        .findOne({
          userId: userId,
          secret: secret,
        })
        .catch((err) => {
          reject(err);
        });
      let done = null;

      if (checkSecret) {
        try {
          newPass = await bcrypt.hash(newPass, 10);
          done = await db.collection(collections.USER).updateOne(
            {
              _id: new ObjectId(userId),
            },
            {
              $set: {
                pass: newPass,
              },
            }
          );
        } catch (err) {
          reject(err);
        } finally {
          if (done?.modifiedCount > 0) {
            await db
              .collection(collections.TEMP)
              .deleteOne({
                userId: userId,
              })
              .catch((err) => {
                console.log(err);
              });

            resolve(done);
          } else {
            reject({ text: "Something Wrong" });
          }
        }
      } else {
        reject({ status: 404 });
      }
    });
  },
  checkForgot: ({ userId, secret }) => {
    return new Promise(async (resolve, reject) => {
      let check = await db
        .collection(collections.TEMP)
        .findOne({
          userId: userId,
          secret: secret,
        })
        .catch((err) => {
          reject(err);
        });

      let user = await db
        .collection(collections.USER)
        .findOne({
          _id: new ObjectId(userId),
        })
        .catch((err) => {
          reject(err);
        });

      if (check && user) {
        resolve(check);
      } else {
        reject({ status: 404 });
      }
    });
  },
  checkUserFound: ({ _id }) => {
    return new Promise(async (resolve, reject) => {
      let user = await db
        .collection(collections.USER)
        .findOne({ _id: new ObjectId(_id) })
        .catch((err) => {
          console.log(err);
          reject(err);
        });

      if (user) {
        resolve(user);
      } else {
        reject({ notExists: true, text: "Not found" });
      }
    });
  },
  deleteUser: (userId) => {
    return new Promise((resolve, reject) => {
      db.collection(collections.USER)
        .deleteOne({
          _id: userId,
        })
        .then(async (res) => {
          if (res?.deletedCount > 0) {
            await db
              .collection(collections.CHAT)
              .deleteOne({
                user: userId.toString(),
              })
              .catch((err) => {
                console.log(err);
              });

            resolve(res);
          } else {
            reject({ text: "DB Getting Something Error" });
          }
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  updateUserProfile: (email, firstName, lastName, image) => {
    return new Promise(async (resolve, reject) => {
      let check = db
        .collection(collections.USER)
        .findOne({
          email: email,
        })
        .catch((err) => {
          reject(err);
        });
      let done = null;

      if (check) {
        try {
          done = await db.collection(collections.USER).updateOne(
            { email },
            {
              $set: {
                fName: firstName,
                lName: lastName,
              },
            }
          );
        } catch (err) {
          reject(err);
        } finally {
          if (done?.modifiedCount > 0) {
            console.log("!").catch((err) => {
              console.log(err);
            });

            resolve(done);
          } else {
            reject({ text: "Something Wrong" });
          }
        }
      } else {
        reject({ status: 404 });
      }
    });
  },
  updateUserProfile1: (email, firstName, lastName, image) => {
    return new Promise((resolve, reject) => {
      db.collection(collections.USER)
        .findOne({ email })
        .then((existingUser) => {
          if (existingUser) {
            if (firstName != "" && lastName != "")
              return db.collection(collections.USER).updateOne(
                { email },
                {
                  $set: {
                    fname: firstName,
                    lname: lastName,
                  },
                }
              );
          }
        })
        .then(() => {
          if (image) {
            const uploadParams = {
              Bucket: process.env.S3_BUCKET_NAME,
              Key: `${email}-${Date.now()}`, // Unique key for the image
              Body: image.data, // Assuming image is a buffer
              ACL: "public-read", // Make the image publicly accessible
            };
            return s3.upload(uploadParams).promise();
          } else {
            return Promise.resolve(); // Return a resolved promise if no image is present
          }
        })
        .then((uploadResult) => {
          if (uploadResult) {
            return db.collection(collections.USER).updateOne(
              { email },
              {
                $set: {
                  profilePicture: uploadResult.Location, // Store the URL of the uploaded image
                },
              }
            );
          }
        })
        .then(() => {
          resolve({ success: true });
        })
        .catch((error) => {
          console.error("Error updating user profile:", error);
          reject({ success: false, error: "Error updating user profile" });
        });
    });
  },
};
