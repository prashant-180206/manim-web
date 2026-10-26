import "./App.css";
import { Route, Routes } from "react-router-dom";
import Home from "./pages/home";
import Scene from "./pages/scene";
import Scene3D from "./pages/scene3d";
import { ManimProvider } from "./context/manimContext";
import { Scene3DProvider } from "./context/scene3dContext";
import ValuesPage from "./pages/values";

function App() {
  return (
    <ManimProvider>
      <Routes>
        <Route path="/" element={<Scene />} />
        <Route path="/scene" element={<Scene />} />
        <Route
          path="/scene3d"
          element={
            <Scene3DProvider>
              <Scene3D />
            </Scene3DProvider>
          }
        />
        <Route path="/playground" element={<Home />} />
        <Route path="/values" element={<ValuesPage />} />
      </Routes>
    </ManimProvider>
  );
}

export default App;
