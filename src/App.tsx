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
        <Route path="/" element={<Scene />} />
        <Route path="/scene" element={<Scene />} />
        <Route path="/playground" element={<Home />} />
        <Route path="/values" element={<ValuesPage />} />
      </Routes>
    </ManimProvider>
  );
}

export default App;
