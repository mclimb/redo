import "dotenv/config"
import "reflect-metadata"
import "react-hot-loader"
import React from "react"
import ReactDOM from "react-dom"
import { client, store } from "./common"
import { defaultTheme } from "@re-do/components"
import { initialRoot } from "state"
import { App } from "./App"

const root = document.getElementById("root")

const render = async () => {
    // TODO remove any type once trello item is done https://trello.com/c/dK1yip1L
    await store.initialize(initialRoot as any)
    ReactDOM.render(
        <App apolloClient={client as any} theme={defaultTheme} />,
        root
    )
}

render()