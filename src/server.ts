import express from "express"
import dotenv from "dotenv"
import rootRoutes from "./routes/index"

dotenv.config()
const app = express()
const port = process.env.PORT

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(rootRoutes)
app.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})
