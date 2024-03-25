import React, { Fragment, useEffect, useRef, useState } from "react";
import {
  Avatar,
  Bar,
  LogOut,
  Message,
  Plus,
  Settings,
  Tab,
  Tick,
  Trash,
  Xicon,
  File,
} from "../../assets/";
import Profile from "../../assets/Profile";
import { emptyUser } from "../../redux/user";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { activePage, addHistory } from "../../redux/history";
import ReactS3, { deleteFile } from "react-s3";
import instance from "../../config/instance";
import "./style.scss";
import { Buffer } from "buffer";
window.Buffer = Buffer;
import { useContext } from "react";
import { documentsContext } from "./../../App";

const S3_BUCKET = "grant-copilot";
const REGION = "us-east-1";
const ACCESS_KEY = "AKIAY7BEJYRC3YUJH3FO";
const SECRET_ACCESS_KEY = "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";

const config = {
  bucketName: S3_BUCKET,
  region: REGION,
  accessKeyId: ACCESS_KEY,
  secretAccessKey: SECRET_ACCESS_KEY,
};

const Menu = ({ changeColorMode }) => {
  let path = window.location.pathname;
  const user = useSelector((state) => state.user);
  let current_chat = useSelector((state) => state.history);
  current_chat = current_chat.filter((obj) => obj.active === true);
  const menuRef = useRef(null);
  const btnRef = useRef(null);
  const settingRef = useRef(null);
  const documentRef = useRef(null);

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { history } = useSelector((state) => state);
  const [confirm, setConfim] = useState(false);
  const [profilePicture, setProfilePicture] = useState(null);
  const [firstName, setFirstName] = useState("Anonymous ");
  const [lastName, setlastName] = useState("User");
  const { documents, getFiles } = useContext(documentsContext);
  const { _id } = useSelector(state => state.messages)

  const logOut = async () => {
    if (window.confirm("Do you want log out")) {
      let res = null;
      try {
        res = await instance.get("/api/user/logout");
      } catch (err) {
        alert(err);
      } finally {
        if (res?.data?.status === 200) {
          alert("Done");
          dispatch(emptyUser());
          navigate("/login");
        }
      }
    }
  };

  const clearHistory = async (del) => {
    if (del) {
      let res = null;

      try {
        res = instance.delete("/api/chat/all");
      } catch (err) {
        alert("Error");
        console.log(err);
      } finally {
        if (res) {
          navigate("/chat");
          dispatch(addHistory([]));
        }

        setConfim(false);
      }
    } else {
      setConfim(true);
    }
  };

  const showMenuMd = () => {
    menuRef.current.classList.add("showMd");
    document.body.style.overflowY = "hidden";
  };

  //Menu

  useEffect(() => {
    window.addEventListener("click", (e) => {
      if (
        !menuRef?.current?.contains(e.target) &&
        !btnRef?.current?.contains(e.target)
      ) {
        menuRef?.current?.classList?.remove("showMd");
        document.body.style.overflowY = "auto";
      }
    });

    window.addEventListener("resize", () => {
      if (!window.matchMedia("(max-width:767px)").matches) {
        document.body.style.overflowY = "auto";
      } else {
        if (menuRef?.current?.classList?.contains("showMd")) {
          document.body.style.overflowY = "hidden";
        } else {
          document.body.style.overflowY = "auto";
        }
      }
    });
  });

  const deleteFile = async (doc) => {
    let response = null;
    console.log(_id);
    try {
      console.log(_id);
      response = await instance.post("/api/chat/deletefile", {
        chatId: _id,
        file_name: doc,
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

  // History Get
  useEffect(() => {
    const getHistory = async () => {
      let res = null;
      try {
        res = await instance.get("/api/chat/history");
      } catch (err) {
        console.log(err);
      } finally {
        if (res?.data) {
          dispatch(addHistory(res?.data?.data));
        }
      }
    };

    getHistory();
  }, [path]);

  // History active
  useEffect(() => {
    setConfim(false);
    let chatId = path.replace("/chat/", "");
    chatId = chatId.replace("/", "");
    dispatch(activePage(chatId));
  }, [path, history]);

  return (
    <Fragment>
      <Modal changeColorMode={changeColorMode} settingRef={settingRef} />
      <DocumentModal
        changeColorMode={changeColorMode}
        documentRef={documentRef}
        documents={documents}
        deleteFile={deleteFile}
      />

      <header>
        <div className="start">
          <button onClick={showMenuMd} ref={btnRef}>
            <Bar />
          </button>
        </div>

        <div className="title">
          {path.length > 6 ? history[0]?.prompt : "New chat"}
        </div>

        <div className="end">
          <button
            onClick={() => {
              if (path.includes("/chat")) {
                navigate("/");
              } else {
                navigate("/chat");
              }
            }}
          >
            <Plus />
          </button>
        </div>
      </header>

      <div className="menu" ref={menuRef}>
        <div>
          <button
            type="button"
            aria-label="new"
            onClick={() => {
              if (path.includes("/chat")) {
                navigate("/");
              } else {
                navigate("/chat");
              }
              setDocuments([]);
            }}
          >
            <Plus />
            New chat
          </button>
        </div>

        <div className="history">
          {history?.map((obj, key) => {
            //console.log(obj)
            if (!obj?.chatId || obj.chat.length === 0) return null;
            if (obj?.active) {
              return (
                <button
                  key={key}
                  className="active"
                  onClick={() => {
                    navigate(`/chat/${obj?.chatId}`);
                  }}
                >
                  <Message />
                  {obj?.chat[0]?.prompt}
                </button>
              );
            } else {
              return (
                <button
                  key={key}
                  onClick={() => {
                    navigate(`/chat/${obj?.chatId}`);
                  }}
                >
                  <Message />
                  {obj?.chat[0]?.prompt}
                </button>
              );
            }
          })}
        </div>

        <div className="actions">
          <button
            onClick={() => {
              if (documentRef?.current) {
                documentRef.current.classList.add("clicked");
                documentRef.current.style.display = "flex";
              }
              getFiles();
            }}
          >
            <File />
            Attached Documents
          </button>
          {history?.length > 0 && (
            <>
              {confirm ? (
                <button onClick={() => clearHistory(true)}>
                  <Tick />
                  Confirm clear conversations
                </button>
              ) : (
                <button onClick={() => clearHistory(false)}>
                  <Trash />
                  Clear conversations
                </button>
              )}
            </>
          )}
          <button
            onClick={() => {
              if (settingRef?.current) {
                settingRef.current.classList.add("clicked");
                settingRef.current.style.display = "flex";
              }
            }}
          >
            <Settings />
            Settings
          </button>
          <button
            onClick={() => {
              window.open(
                "https://platform.openai.com/docs/guides/prompt-engineering",
                "_blank"
              );
            }}
          >
            <Tab />
            Prompt Assist
          </button>
          <button onClick={logOut}>
            <LogOut />
            Log out
          </button>
          <button>
            <Profile profilePicture={user.profilePicture} />
            {user?.fName + " " + user.lName}
          </button>
        </div>
      </div>

      <div className="exitMenu">
        <button>
          <Xicon />
        </button>
      </div>
    </Fragment>
  );
};

export default Menu;

const Modal = ({ changeColorMode, settingRef }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const user = useSelector((state) => state.user);
  const updateUser = async () => {
    // Gather input values
    const firstName = document.getElementById("first-name").value;
    const lastName = document.getElementById("last-name").value;
    let profilePicture = fileInputRef.current.files[0]; // Get the selected file
    console.log(profilePicture);
    try {
      const data = await ReactS3.uploadFile(profilePicture, config);
      profilePicture = data.location;
      console.log("first name");
      // console.log(data.location)
      // Create FormData to send data
      const formData = new FormData();
      formData.append("email", user?.email);
      formData.append("firstName", firstName);
      formData.append("lastName", lastName);
      formData.append("profilePicture", profilePicture);
      // Make request to update user with FormData
      const response = await instance.post(
        "/api/user/update_profile",
        formData,
        {
          headers: {
            "Content-Type": "application/json", // Set content type to  multipart/form-data
          },
        }
      );

      // Handle response here
      console.log("Update successful:", response.data);
    } catch (err) {
      console.error("Error updating user:", err);
      if (err?.response?.status === 405) {
        alert("Not Logged");
        dispatch(emptyUser());
        navigate("/login");
      } else {
        alert("An error occurred while updating user");
      }
    } finally {
      window.location.reload();
    }
  };

  

  const deleteAccount = async () => {
    if (window.confirm("Do you want delete your account")) {
      let res = null;
      try {
        res = await instance.delete("/api/user/account");
      } catch (err) {
        console.log(err);
        if (err?.response?.data?.status === 405) {
          alert("Not Logged");
          dispatch(emptyUser());
          navigate("/login");
        } else {
          alert(err);
        }
      } finally {
        alert("Success");
        dispatch(emptyUser());
        navigate("/login");
      }
    }
  };

  return (
    <div
      className="settingsModal"
      ref={settingRef}
      onClick={(e) => {
        let inner = settingRef.current.childNodes;
        if (!inner?.[0]?.contains(e.target)) {
          settingRef.current.style.display = "none";
        }
      }}
    >
      <div className="inner">
        <div
          className="content top"
          style={{ display: "flex", flexDirection: "row" }}
        >
          <h3>Settings</h3>
          <button
            onClick={() => {
              settingRef.current.style.display = "none";
            }}
          >
            <Xicon />
          </button>
        </div>
        <div className="content ceneter">
          <div className="content-input">
            <label htmlFor="name">First Name</label>
            <input type="text" id="first-name" className="" />
            <label htmlFor="name">Last Name</label>
            <input type="text" id="last-name" className="" />
          </div>
          <div className="content-input">
            <label htmlFor="profile-picture">Profile Picture</label>
            <input type="file" id="profile-picture" ref={fileInputRef} />
          </div>
          <div className="content-submit">
            <div>
              <p>Dark mode</p>
              <button
                onClick={() => {
                  let mode = localStorage.getItem("darkMode");
                  if (mode) {
                    changeColorMode(false);
                  } else {
                    changeColorMode(true);
                  }
                }}
                role="switch"
                type="button"
              >
                <div></div>
              </button>
            </div>

            <button
              className="content-button"
              onClick={() => {
                settingRef.current.style.display = "none";
                updateUser();
              }}
            >
              Update
            </button>
          </div>
        </div>
        <div className="bottum">
          <button className="end" onClick={deleteAccount}>
            Delete account
          </button>
        </div>
      </div>
    </div>
  );
};

const DocumentModal = ({ changeColorMode, documentRef, documents, deleteFile }) => {
  return (
    <div
      className="settingsModal"
      ref={documentRef}
      onClick={(e) => {
        let inner = documentRef.current.childNodes;
        if (!inner?.[0]?.contains(e.target)) {
          documentRef.current.style.display = "none";
        }
      }}
    >
      <div className="inner">
        <div
          className="content top"
          style={{ display: "flex", flexDirection: "row" }}
        >
          <h3>Attached Documents</h3>
          <button
            onClick={() => {
              documentRef.current.style.display = "none";
            }}
          >
            <Xicon />
          </button>
        </div>
        <div className="content ceneter">
          {documents &&
            documents.map((doc, index) => {
              return (
                doc && (
                  <div
                    key={index}
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <p>
                      {index}. {doc}
                    </p>
                    <div style={{ cursor: "pointer" }} onClick={() =>deleteFile(doc)}>
                      <Xicon />
                    </div>
                  </div>
                )
              );
            })}
        </div>
      </div>
    </div>
  );
};
