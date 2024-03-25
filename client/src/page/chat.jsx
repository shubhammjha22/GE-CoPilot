import React, { useEffect, useReducer, useRef, useState } from "react";
import { Reload, Rocket, Stop } from "../assets";
import { Chat, New } from "../components";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { setLoading } from "../redux/loading";
import { useDispatch, useSelector } from "react-redux";
import { addList, emptyAllRes, insertNew, livePrompt } from "../redux/messages";
import { emptyUser } from "../redux/user";
import { useContext } from "react";
import { documentsContext } from "./../App";
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

const Main = ({ file_id, set_file_id }) => {
  let location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const chatRef = useRef();
  const { user } = useSelector((state) => state);
  const { id = null } = useParams();
  const { _id } = useSelector((state) => state.messages);
  const { documents, getFiles } = useContext(documentsContext);
  const [status, stateAction] = useReducer(reducer, {
    chat: false,
    error: false,
    actionBtns: false,
  });

  useEffect(() => {
    getFiles();
  }, [_id]);

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

      <InputArea
        status={status}
        chatRef={chatRef}
        stateAction={stateAction}
        file_id={file_id}
        set_file_id={set_file_id}
        getFiles={getFiles}
        documents={documents}
      />
    </div>
  );
};

export default Main;

//Input Area
const InputArea = ({
  status,
  chatRef,
  stateAction,
  file_id,
  set_file_id,
  getFiles,
  documents,
}) => {
  let textAreaRef = useRef();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [last_prompt, set_last_prompt] = useState(null);
  let { prompt, content, _id } = useSelector((state) => state.messages);
  console.log(_id);

  useEffect(() => {
    getFiles();
  }, [_id]);
  useEffect(() => {
    textAreaRef.current?.addEventListener("input", (e) => {
      textAreaRef.current.style.height = "auto";
      textAreaRef.current.style.height =
        textAreaRef.current.scrollHeight + "px";
    });
  });
  const handleFileUpload = async (e) => {
    let response = null;
    try {
      const file = e.target.files[0];
      console.log(file);
      if (
        file.name.endsWith(".pdf") ||
        file.name.endsWith(".txt") ||
        file.name.endsWith(".csv") ||
        file.name.endsWith(".docx")
      ) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("chatId", _id);
        response = await instance.post("/api/chat/upload", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        console.log(response.data);
      } else {
        alert("File type not supported");
      }
    } catch (error) {
      console.log(error);
    } finally {
      if (response?.data?.data?.chatId) {
        dispatch(insertNew({ _id: response?.data?.data?.chatId }));
        console.log(response?.data?.data?.chatId);
        navigate(`/chat/${response?.data?.data?.chatId}`);
        alert("File uploaded successfully");
        getFiles();
      } else {
        alert(`File upload failed due to unsupported file type`);
      }
    }
  };

  const deleteFile = async (e) => {
    let response = null;
    console.log(_id);
    try {
      const file = e.target.textContent;
      console.log(file, _id);
      response = await instance.post("/api/chat/deletefile", {
        chatId: _id,
        file_name: file,
      });
      console.log(response?.data);
    } catch (error) {
      console.log(error);
    } finally {
      if (response?.status === 200) {
        getFiles();
      } else {
        alert("File delete failed");
      }
    }
  };

  const FormHandle = async () => {
    prompt = last_prompt;
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
          });
          console.log("PUT", res.data);
        } else {
          dispatch(livePrompt(""));
          res = await instance.post("/api/chat", {
            prompt,
            file_id,
            chatId: _id,
          });
          console.log("POST", res.data);
          navigate(`/chat/${res?.data?.data?._id}`);
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
          set_file_id(null);
          const { _id, content } = res?.data?.data;
          console.log(_id, content);
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
                      // chatRef.current.loadResponse(stateAction);
                      FormHandle();
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
          <div className="files-div">
            <div className="flexBody">
              <div className="upload-file" style={{ cursor: "pointer" }}>
                <label htmlFor="fileInput">
                  <input
                    type="file"
                    id="fileInput"
                    accept="application/pdf,text/plain,text/csv"
                    style={{ display: "none", cursor: "pointer" }}
                    onChange={handleFileUpload}
                  />
                  <Upload />
                </label>
              </div>
              <div className="box">
                {/* <div className="files">
                  {documents?.length > 0 &&
                    documents?.map((doc, index) => {
                      return (
                        <div key={index} className="file">
                          <p className="file-name" onClick={deleteFile}>
                            {doc}
                          </p>
                        </div>
                      );
                    })}
                </div> */}
                <textarea
                  ref={textAreaRef}
                  value={prompt}
                  onChange={(e) => {
                    set_last_prompt(e.target.value);
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
