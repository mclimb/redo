import { removeSync, moveSync } from "fs-extra"
import { command } from "@re-do/utils/dist/command"

removeSync(".tmp-sls-pkg")
command("unzip .serverless/redo-server.zip -d .tmp-sls-pkg")
command("rsync -rk node_modules/@types .tmp-sls-pkg/node_modules")
command("rsync -rk node_modules/@prisma .tmp-sls-pkg/node_modules")
command("zip -r redo-server.zip *", { cwd: ".tmp-sls-pkg" })
moveSync(".tmp-sls-pkg/redo-server.zip", ".serverless/redo-server.zip", {
    overwrite: true
})
removeSync(".tmp-sls-pkg")