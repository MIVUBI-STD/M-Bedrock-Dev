import { mount } from "svelte";
import App from "./App.svelte";

const target = document.getElementById("app");
if (!target) throw new Error("Bug Report UI root element is missing.");

mount(App, { target });
