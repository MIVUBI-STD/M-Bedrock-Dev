import "./app.css";
import { mount } from "svelte";
import App from "./App.svelte";

const target = document.getElementById("app");
if (!target) throw new Error("Virtual Clients UI root element is missing.");

mount(App, { target });
