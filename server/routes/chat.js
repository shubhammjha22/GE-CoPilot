import { Router } from "express";
import dotnet from "dotenv";
import user from "../helpers/user.js";
import jwt from "jsonwebtoken";
import chat from "../helpers/chat.js";
import OpenAI, { toFile } from "openai";
import { db } from "../db/connection.js";
import collections from "../db/collections.js";
import multer from "multer";
import fs from "fs";
import { ObjectId } from "mongodb";
dotnet.config();

let router = Router();
const upload = multer({ dest: "uploads/" });

const CheckUser = async (req, res, next) => {
  jwt.verify(
    req.cookies?.userToken,
    process.env.JWT_PRIVATE_KEY,
    async (err, decoded) => {
      if (decoded) {
        let userData = null;

        try {
          userData = await user.checkUserFound(decoded);
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
          if (userData) {
            req.body.userId = userData._id;
            next();
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
};

const client = new OpenAI({
  apiKey: "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",
});
const openai = new OpenAI({ apiKey: "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"});

router.get("/", (req, res) => {
  res.send("Welcome to chatGPT api v1");
});

router.get("/upload", CheckUser, async (req, res) => {
  const { userId } = req.body;
  const { chatId } = req.query;
  let chat = await db.collection(collections.CHAT).findOne({
    user: userId.toString(),
    "data.chatId": chatId,
  });
  if (chat) {
    chat = chat.data.filter((obj) => {
      return obj.chatId === chatId;
    });
    chat = chat[0];
    res.status(200).json({
      status: 200,
      message: "Success",
      data: chat.file_name,
    });
  } else {
    res.status(404).json({
      status: 404,
      message: "Not found",
    });
  }
});

router.post("/upload", upload.single("file"), CheckUser, async (req, res) => {
  // take file object from frontend upload to openai and store id and file name to mongo db
  const { userId, chatId } = req.body;
  const file = fs.createReadStream(req ? req.file.path : null);
  let response = null;
  try {
    response = await client.files.create({
      purpose: "assistants",
      file: file,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      status: 500,
      message: err,
    });
    return; // Exit early in case of an error
  }
  // delete the file from the uploads folder after uploading to openai
  let file_id = null;
  let file_name = null;

  if (response) {
    file_id = response.id;
    file_name = req.file.originalname;

    let chatIdToSend = null; // Variable to store the chatId to send in the response

    const chat = await db
      .collection(collections.CHAT)
      .aggregate([
        {
          $match: {
            user: userId.toString(),
          },
        },
        {
          $unwind: "$data",
        },
        {
          $match: {
            "data.chatId": chatId,
          },
        },
        {
          $project: {
            files: "$data.files",
          },
        },
      ])
      .toArray();
    let all_files = [];
    if (chat[0]?.files?.length > 0) {
      all_files = [...chat[0].files, file_id];
    } else {
      all_files = [file_id];
    }
    const assistant = await client.beta.assistants.create({
      name: "GE CoPilot",
      instructions:
        "You are a helpful and that answers what is asked. Retrieve the relevant information from the files.",
      tools: [{ type: "retrieval" }, { type: "code_interpreter" }],
      model: "gpt-4-0125-preview",
      file_ids: all_files,
    });
    if (chat.length>0) {
      chatIdToSend = chatId; // Use existing chatId
      await db.collection(collections.CHAT).updateOne(
        {
          user: userId.toString(),
          "data.chatId": chatId,
        },
        {
          $addToSet: {
            "data.$.files": file_id,
            "data.$.file_name": file_name,
          },
          $set: {
            "data.$.assistant_id": assistant.id,
          },
        }
      );
    } else {
      const newChatId = new ObjectId().toHexString();
      chatIdToSend = newChatId; // Use newly generated chatId
      await db.collection(collections.CHAT).updateOne(
        {
          user: userId.toString(),
        },
        {
          $push: {
            data: {
              chatId: newChatId,
              files: [file_id],
              file_name: [file_name],
              chats: [],
              chat: [],
              assistant_id: assistant.id,
            },
          },
        },
        {
          new: true,
          upsert: true,
        }
      );
    }

    res.status(200).json({
      status: 200,
      message: "Success",
      data: {
        file_id,
        file_name,
        chatId: chatIdToSend, // Send the correct chatId in the response
      },
    });
  }
});

router.post("/", CheckUser, async (req, res) => {
  const { prompt, userId } = req.body;
  let response = {};
  try {
    console.log("POST is being called", req.body);
    // If no file_id is given
    response.openai = await openai.chat.completions.create({
      model: "gpt-4-0125-preview",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful and that answers what is asked. Dont show the mathematical steps if not asked.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      top_p: 0.5,
    });
    if (response.openai.choices[0].message) {
      response.openai = response.openai.choices[0].message.content;
      let index = 0;
      for (let c of response["openai"]) {
        if (index <= 1) {
          if (c == "\n") {
            response.openai = response.openai.slice(1, response.openai.length);
          }
        } else {
          break;
        }
        index++;
      }
      response.db = await chat.newResponse(prompt, response, userId);
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({
      status: 500,
      message: err,
    });
  } finally {
    if (response?.db && response?.openai) {
      res.status(200).json({
        status: 200,
        message: "Success",
        data: {
          _id: response.db["chatId"],
          content: response.openai,
        },
      });
    }
  }
});

router.put("/", CheckUser, async (req, res) => {
  const { prompt, userId, chatId } = req.body;
  console.log("PUT is being called", req.body);
  let mes = {
    role: "system",
    content:
      "You are a helpful and that answers what is asked. Dont show the mathematical steps if not asked.",
  };
  let full = "";
  let message = await chat.Messages(userId, chatId);
  message = message[0].chats;
  mes = [mes, ...message];
  mes = [
    ...mes,
    {
      role: "user",
      content: prompt,
    },
  ];
  let response = {};
  let new_chat = await db.collection(collections.CHAT).findOne({
    user: userId.toString(),
    data: { $elemMatch: { chatId: chatId } },
  });
  new_chat = new_chat.data.filter((obj) => {
    return obj.chatId === chatId;
  });
  new_chat = new_chat[0];
  const assistant_id = new_chat.assistant_id;
  try {
    if (assistant_id) {
      console.log("Assistant running");

      const thread = await client.beta.threads.create({
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });
      const run = await client.beta.threads.runs.create(thread.id, {
        assistant_id: assistant_id,
      });
      let final_run = "";
      while (final_run.status !== "completed") {
        final_run = await client.beta.threads.runs.retrieve(thread.id, run.id);
      }
      console.log(final_run.status);
      const messages = await client.beta.threads.messages.list(thread.id);
      response = { openai: messages.data[0].content[0].text.value };
      if (response.openai) {
        let index = 0;
        for (let c of response["openai"]) {
          if (index <= 1) {
            if (c == "\n") {
              response.openai = response.openai.slice(
                1,
                response.openai.length
              );
            }
          } else {
            break;
          }
          index++;
        }
        response.db = await chat.Response(
          prompt,
          response,
          userId,
          chatId,
          assistant_id
        );
      }
    } else {
      response.openai = await openai.chat.completions.create({
        model: "gpt-4-0125-preview",
        messages: mes,
        top_p: 0.52,
        stream: true,
      });
      for await (const part of response.openai) {
        let text = part.choices[0].delta.content ?? "";
        full += text;
      }
      response.openai = {
        role: "assistant",
        content: full,
      };
      if (response.openai) {
        response.openai = response.openai.content;
        let index = 0;
        for (let c of response["openai"]) {
          if (index <= 1) {
            if (c == "\n") {
              response.openai = response.openai.slice(
                1,
                response.openai.length
              );
            }
          } else {
            break;
          }
          index++;
        }
        response.db = await chat.Response(
          prompt,
          response,
          userId,
          chatId,
          assistant_id
        );
      }
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({
      status: 500,
      message: err,
    });
  } finally {
    if (response?.db && response?.openai) {
      res.status(200).json({
        status: 200,
        message: "Success",
        data: {
          content: response.openai,
          chatId: response.db.chatId,
        },
      });
    }
  }
});

router.get("/saved", CheckUser, async (req, res) => {
  const { userId } = req.body;
  const { chatId = null } = req.query;

  let response = null;

  try {
    response = await chat.getChat(userId, chatId);
  } catch (err) {
    if (err?.status === 404) {
      res.status(404).json({
        status: 404,
        message: "Not found",
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

router.get("/history", CheckUser, async (req, res) => {
  const { userId } = req.body;

  let response = null;

  try {
    response = await chat.getHistory(userId);
  } catch (err) {
    res.status(500).json({
      status: 500,
      message: err,
    });
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

router.delete("/all", CheckUser, async (req, res) => {
  const { userId } = req.body;

  let response = null;

  try {
    response = await chat.deleteAllChat(userId);
  } catch (err) {
    res.status(500).json({
      status: 500,
      message: err,
    });
  } finally {
    if (response) {
      res.status(200).json({
        status: 200,
        message: "Success",
      });
    }
  }
});

//Router for Attached Documnets Modal

router.post("/getfile", async (req, res) => {
  const { userId, chatId } = req.body;
  let response = null;

  try {
    response = await chat.getFiles(userId, chatId);
  } catch (err) {
    res.status(500).json({
      status: 500,
      message: err,
    });
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

router.post("/deletefile", CheckUser, async (req, res) => {
  const { userId, chatId, file_name } = req.body;
  let response = null;

  try {
    const file_id_obj = await db.collection(collections.CHAT).aggregate([
      {
        $match: {
          user: userId.toString(),
        },
      },
      {
        $unwind: "$data",
      },
      {
        $match: {
          "data.chatId": chatId,
        },
      },
      {
        $project: {
          data: 1,
          file_index: {
            $indexOfArray: ["$data.file_name", file_name]
          }
        }
      }
    ]).toArray();
    let file_id = file_id_obj[0]?.data?.files[file_id_obj[0]?.file_index];
    response = await chat.deleteFile(userId, chatId, file_name, file_id);
  } catch (err) {
    console.log(err);
    res.status(500).json({
      status: 500,
      message: err,
    });
  } finally {
    if (response) {
      res.status(200).json({
        status: 200,
        message: "Success",
      });
    }
  }
});

export default router;
