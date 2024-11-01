import React from "react"
import ReactDOM from "react-dom/client"

import App from "./App"

import "./styles/globals.css"

import { Toaster } from "@/components/ui/toaster"

ReactDOM.createRoot(document.getElementById("root")).render(
  <>
    <App />
    <Toaster />
  </>
)
