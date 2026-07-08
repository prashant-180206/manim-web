// import { useState } from "react";
// import reactLogo from "./assets/react.svg";
// import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import { Link, Route, Routes } from "react-router-dom";
import Home from "./pages/home";
import Scene from "./pages/scene";

function App() {
  // const [greetMsg, setGreetMsg] = useState("");
  // const [name, setName] = useState("");

  // async function greet() {
  //   // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
  //   setGreetMsg(await invoke("greet", { name }));
  // }

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<Scene />} />
      {/* <Route path="/contact" element={<Contact />} /> */}
    </Routes>
  );
}

export default App;
