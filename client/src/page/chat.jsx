import React, { useEffect, useReducer, useRef, useState } from "react";
import { Reload, Rocket, Stop } from "../assets";
import { Chat, New } from "../components";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { setLoading } from "../redux/loading";
import { useDispatch, useSelector } from "react-redux";
import { addList, emptyAllRes, insertNew, livePrompt } from "../redux/messages";
import { emptyUser } from "../redux/user";
import OpenAI from "openai";
import instance from "../config/instance";
import Upload from "./../assets/upload";
import "./style.scss";

const reducer = (state, { type, status }) => {
  switch (type) {
    case "chat":
      return {
        chat: status,
        loading: status,
        resume: status,
        actionBtns: false,
      };
    case "error":
      return {
        chat: true,
        error: status,
        resume: state.resume,
        loading: state.loading,
        actionBtns: state.actionBtns,
      };
    case "resume":
      return {
        chat: true,
        resume: status,
        loading: status,
        actionBtns: true,
      };
    default:
      return state;
  }
};

const Main = ({file_id, set_file_id}) => {
  let location = useLocation();

  const navigate = useNavigate();

  const dispatch = useDispatch();

  const chatRef = useRef();

  const { user } = useSelector((state) => state);

  const { id = null } = useParams();

  const [status, stateAction] = useReducer(reducer, {
    chat: false,
    error: false,
    actionBtns: false,
  });


  useEffect(() => {
    if (user) {
      dispatch(emptyAllRes());
      setTimeout(() => {
        if (id) {
          const getSaved = async () => {
            let res = null;
            try {
              res = await instance.get("/api/chat/saved", {
                params: {
                  chatId: id,
                },
              });
            } catch (err) {
              console.log(err);
              if (err?.response?.data?.status === 404) {
                navigate("/404");
              } else {
                alert(err);
                dispatch(setLoading(false));
              }
            } finally {
              if (res?.data) {
                dispatch(addList({ _id: id, items: res?.data?.data }));
                stateAction({ type: "resume", status: false });
                dispatch(setLoading(false));
              }
            }
          };

          getSaved();
        } else {
          stateAction({ type: "chat", status: false });
          dispatch(setLoading(false));
        }
      }, 1000);
    }
  }, [location]);

  return (
    <div className="main">
      <div className="contentArea">
        {status.chat ? <Chat ref={chatRef} error={status.error} /> : <New />}
      </div>

      <InputArea status={status} chatRef={chatRef} stateAction={stateAction} file_id={file_id} set_file_id={set_file_id} />
    </div>
  );
};

export default Main;

//Input Area
const InputArea = ({ status, chatRef, stateAction, file_id, set_file_id }) => {
  let textAreaRef = useRef();
  const [files, setFiles] = useState("");
  const navigate = useNavigate();
  // const [file_id, set_file_id] = useState(null);
  const dispatch = useDispatch();
  // const [assistant_id, set_assistant_id] = useState(null);

  const { prompt, content, _id } = useSelector((state) => state.messages);
  
  useEffect(() => {
    if (files) {
      handleChange();
    }
  });
  useEffect(() => {
    textAreaRef.current?.addEventListener("input", (e) => {
      textAreaRef.current.style.height = "auto";
      textAreaRef.current.style.height =
        textAreaRef.current.scrollHeight + "px";
    });
  });
  const handleChange = async () => {
    try {
      const client = new OpenAI({
        apiKey: "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",
        dangerouslyAllowBrowser: true,
      });
      console.log(files)
      const file_n = await client.files.create({
        purpose: "assistants",
        file: files,
      });
    //   console.log("Assistant is being created")
    //   const assistant = await client.beta.assistants.create({
    //     name: "GE CoPilot",
    //     instructions:
    //         "You are a helpful and that answers what is asked. Retrieve the relevant information from the files.",
    //     tools: [{ type: "retrieval" }],
    //     model: "gpt-3.5-turbo",
    //     file_ids: [file_n.id],
    // });
    //   //console.log(file_n)
      console.log(file_n.id);
      set_file_id(file_n.id);
      // set_assistant_id(assistant.id)
      setFiles("")
    } catch (error) {
      console.log(error);
    }
  };
  const FormHandle = async () => {
    if (prompt?.length > 0) {
      chatRef?.current?.clearResponse();
      stateAction({ type: "chat", status: true });

      let chatsId = Date.now();

      dispatch(insertNew({ id: chatsId, content: "", prompt }));

      let res = null;

      try {
        if (_id) {
          console.log(prompt, content, _id);
          dispatch(livePrompt(""));
          res = await instance.put("/api/chat", {
            chatId: _id,
            prompt,
            file_id,
            // assistant_id,
          });
          console.log("PUT", res.data)
        } else {
          dispatch(livePrompt(""));
          res = await instance.post("/api/chat", {
            prompt,
            file_id,
            // assistant_id
          });
          console.log("POST", res.data)
        }
      } catch (err) {
        console.log(err.response.data);
        if (err?.response?.data?.status === 405) {
          dispatch(emptyUser());
          dispatch(emptyAllRes());
          navigate("/login");
        } else {
          stateAction({ type: "error", status: true });
        }
      } finally {
        if (res?.data) {
          const { _id, content } = res?.data?.data;
          console.log(_id, content)
          dispatch(insertNew({ _id, fullContent: content, chatsId }));

          chatRef?.current?.loadResponse(stateAction, content, chatsId);

          stateAction({ type: "error", status: false });
          
        }
      }
    }
  };

  useEffect(() => {
    const handleInput = (e) => {
      if (e.key === "Enter" && e.shiftKey) {
        e.preventDefault();
        FormHandle(textAreaRef.current.value.trim());
        textAreaRef.current.value = "";
      }
    };

    textAreaRef.current?.addEventListener("keydown", handleInput);

    return () => {
      textAreaRef.current?.removeEventListener("keydown", handleInput);
    };
  }, [FormHandle]);

  return (
    <div className="inputArea">
      {!status.error ? (
        <>
          <div className="chatActionsLg">
            {status.chat && content?.length > 0 && status.actionBtns && (
              <>
                {!status?.resume ? (
                  <button
                    onClick={() => {
                      chatRef.current.loadResponse(stateAction);
                    }}
                  >
                    <Reload /> Regenerate response
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      chatRef.current.stopResponse(stateAction);
                    }}
                  >
                    <Stop /> Stop generating
                  </button>
                )}
              </>
            )}
          </div>

          <div className="flexBody">
            <div className="upload-file">
              <label htmlFor="fileInput">
                <input
                  type="file"
                  id="fileInput"
                  //accept=".png, .jpg, .pdf"
                  style={{ display: "none", cursor: "pointer" }}
                  onChange={(e) => setFiles(e.target.files[0])}
                />
                <Upload />
              </label>
            </div>
            <div className="box">
              <textarea
                ref={textAreaRef}
                value={prompt}
                onChange={(e) => {
                  dispatch(livePrompt(e.target.value));
                }}
              />
              {!status?.loading ? (
                <button
                  onClick={() => {
                    console.log(textAreaRef.current.value);
                    textAreaRef.current.value = "";
                    FormHandle();
                  }}
                >
                  {<Rocket />}
                </button>
              ) : (
                <div className="loading">
                  <div className="dot" />
                  <div className="dot-2 dot" />
                  <div className="dot-3 dot" />
                </div>
              )}
            </div>

            {status.chat && content?.length > 0 && status.actionBtns && (
              <>
                {!status?.resume ? (
                  <div className="chatActionsMd">
                    <button
                      onClick={() => {
                        chatRef.current.loadResponse(stateAction);
                      }}
                    >
                      <Reload />
                    </button>
                  </div>
                ) : (
                  <div className="chatActionsMd">
                    <button
                      onClick={() => {
                        chatRef.current.stopResponse(stateAction);
                      }}
                    >
                      <Stop />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      ) : (
        <div className="error">
          <p>There was an error generating a response</p>
          <button onClick={FormHandle}>
            <Reload />
            Regenerate response
          </button>
        </div>
      )}
    </div>
  );
};
