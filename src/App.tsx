// import { useState } from "react";
// import reactLogo from "./assets/react.svg";
// import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import { Route, Routes } from "react-router-dom";
import Home from "./pages/home";
import Scene from "./pages/scene";
import { ManimProvider } from "./context/manimContext";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <ManimProvider>
        <Route path="/scene" element={<Scene />} />
      </ManimProvider>
    </Routes>
  );
}

export default App;
