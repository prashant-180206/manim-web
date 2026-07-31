// import { useState } from "react";
// import reactLogo from "./assets/react.svg";
// import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import { Route, Routes } from "react-router-dom";
import Home from "./pages/home";
import Scene from "./pages/scene";
import { ManimProvider } from "./context/manimContext";
import ValuesPage from "./pages/values";

function App() {
  return (
    <ManimProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/values" element={<ValuesPage />} />
        <Route path="/scene" element={<Scene />} />
      </Routes>
    </ManimProvider>
  );
}

export default App;
