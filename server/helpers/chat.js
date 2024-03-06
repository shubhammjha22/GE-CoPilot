import { db } from "../db/connection.js";
import collections from "../db/collections.js";
import { ObjectId } from "mongodb";

export default {
  newResponse: (prompt, { openai }, userId, assistant_id,file_id,file_name) => {
    return new Promise(async (resolve, reject) => {
      let chatId = new ObjectId().toHexString();
      let res = null;
      try {
        await db
          .collection(collections.CHAT)
          .createIndex({ user: 1 }, { unique: true });
        res = await db.collection(collections.CHAT).insertOne({
          user: userId.toString(),

          data: [
            {
              chatId,
              assistant_id,
              files: [file_id],
              file_name:[file_name],
              chats: [
                {
                  role: "user",
                  content: prompt,
                },
                {
                  role: "assistant",
                  content: openai,
                },
              ],
              chat: [
                {
                  prompt: prompt,
                  content: openai,
                },
              ],
            },
          ],
        });
      } catch (err) {
        if (err?.code === 11000) {
          res = await db
            .collection(collections.CHAT)
            .updateOne(
              {
                user: userId.toString(),
              },
              {
                $push: {
                  data: {
                    chatId,
                    assistant_id,
                    files : [file_id],
                    file_name:[file_name],
                    chats: [
                      {
                        role: "user",
                        content: prompt,
                      },
                      {
                        role: "assistant",
                        content: openai,
                      },
                    ],
                    chat: [
                      {
                        prompt: prompt,
                        content: openai,
                      },
                    ],
                  },
                },
              }
            )
            .catch((err) => {
              reject(err);
            });
        } else {
          reject(err);
        }
      } finally {
        if (res) {
          res.chatId = chatId;
          console.log(res);
          resolve(res);
        } else {
          reject({ text: "DB gets something wrong" });
        }
      }
    });
  },
  Response: (prompt, { openai }, userId, chatId, assistant_id,file_name) => {
    console.log(file_name," ------------------------------------")
    return new Promise(async (resolve, reject) => {
      let res = null;
      try {
        let updateObj = {
          $push: {
            "data.$.chats": {
              $each: [
                { role: "user", content: prompt },
                { role: "assistant", content: openai },
              ],
            },
            "data.$.chat": {
              prompt: prompt,
              content: openai,
            },
          },
        };
         // If file_name is not empty and not already present in the array, push it
        if (file_name && file_name.trim() !== "") {
          updateObj.$addToSet = {
              "data.$.file_name": file_name
          };
      }
        // If assistant_id is null, set it to the incoming assistant_id
        if (assistant_id !== null) {
          updateObj.$set = {
            "data.$.assistant_id": assistant_id,
          };
        }

        // Execute the update operation
        res = await db.collection(collections.CHAT).updateOne(
          {
            user: userId.toString(),
            "data.chatId": chatId,
          },
          updateObj
        );
      } catch (err) {
        console.log(err);
        reject(err);
      } finally {
        if (res) {
          res.chatId = chatId;
          //console.log(chatId);
          resolve(res);
        } else {
          reject({ text: "DB gets something wrong" });
        }
      }
    });
  },

  updateChat: (chatId, prompt, { openai }, userId) => {
    return new Promise(async (resolve, reject) => {
      let res = await db
        .collection(collections.CHAT)
        .updateOne(
          {
            user: userId.toString(),
            "data.chatId": chatId,
          },
          {
            $push: {
              data: {
                chatId,
                chats: [
                  {
                    role: "user",
                    content: prompt,
                  },
                  {
                    role: "assistant",
                    content: openai,
                  },
                ],
              },
            },
          }
        )
        .catch((err) => {
          reject(err);
        });

      if (res) {
        resolve(res);
      } else {
        reject({ text: "DB gets something wrong" });
      }
    });
  },
  getChat: (userId, chatId) => {
    return new Promise(async (resolve, reject) => {
      let res = await db
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
              _id: 0,
              chat: "$data.chat",
            },
          },
        ])
        .toArray()
        .catch((err) => [reject(err)]);

      if (res && Array.isArray(res) && res[0]?.chat) {
        resolve(res[0].chat);
      } else {
        reject({ status: 404 });
      }
    });
  },
  getHistory: (userId) => {
    return new Promise(async (resolve, reject) => {
      let res = await db
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
            $project: {
              _id: 0,
              chatId: "$data.chatId",
              chat: "$data.chat", // Project the entire 'chats' array
            },
          },
        ])
        .toArray()
        .catch((err) => {
          reject(err);
        });

      if (Array.isArray(res)) {
        resolve(res);
      } else {
        reject({ text: "DB Getting Some Error" });
      }
    });
  },
  deleteAllChat: (userId) => {
    return new Promise((resolve, reject) => {
      db.collection(collections.CHAT)
        .deleteOne({
          user: userId.toString(),
        })
        .then((res) => {
          if (res?.deletedCount > 0) {
            resolve(res);
          } else {
            reject({ text: "DB Getting Some Error" });
          }
        })
        .catch((err) => {
          reject(err);
        });
    });
  },

  //Get all message for OpenAI History
  Messages: (userId, chatId) => {
    return new Promise(async (resolve, reject) => {
      let res = await db
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
              _id: 0,
              chats: "$data.chats", // Project the entire 'chats' array
            },
          },
        ])
        .toArray()
        .catch((err) => {
          reject(err);
        });

      if (Array.isArray(res)) {
        resolve(res);
      } else {
        reject({ text: "DB Getting Some Error" });
      }
    });
  },
  //Get all file name
  getFiles: (userId, chatId) => {
    console.log(userId, chatId)
    return new Promise(async (resolve, reject) => {
      let res = await db
        .collection(collections.CHAT)
        .aggregate([
          {
            $match: {
              user: userId,
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
              _id: 0,
              file_name: "$data.file_name", // Project the entire 'FileName' array
            },
          },
        ])
        .toArray()
        .catch((err) => {
          reject(err);
        });

      if (Array.isArray(res)) {
        console.log(res)
        resolve(res);
      } else {
        reject({ text: "DB Getting Some Error" });
      }
    });
  },

};

