/* eslint-disable no-console */
import { Server } from "http";
import mongoose from "mongoose";


import dotenv from "dotenv";
import { prisma } from "./config/db";
import app from "./app";




let server: Server;

dotenv.config();
async function connectToDB() {
  try {
    await prisma.$connect()
    console.log("*** DB connection successfully(--)!!!!!")
  } catch (error) {
    console.log("*** DB connection failed!")
    console.log(error);
    process.exit(1);
  }
}
const startServer = async () => {
    try {
          await connectToDB()
       

        server = app.listen(process.env.PORT, () => {
            console.log(`Server is listening to port ${process.env.PORT}`);
        });
    } catch (error) {
        console.log(error);
    }
}

(async () => {
    await startServer()
     
})()

process.on("SIGTERM", () => {
    console.log("SIGTERM signal received... Server shutting down..");

    if (server) {
        server.close(() => {
            process.exit(1)
        });
    }

    process.exit(1)
})

process.on("SIGINT", () => {
    console.log("SIGINT signal recieved... Server shutting down..");

    if (server) {
        server.close(() => {
            process.exit(1)
        });
    }

    process.exit(1)
})


process.on("unhandledRejection", (err) => {
    console.log("Unhandled Rejecttion detected... Server shutting down..", err);

    if (server) {
        server.close(() => {
            process.exit(1)
        });
    }

    process.exit(1)
})

process.on("uncaughtException", (err) => {
    console.log("Uncaught Exception detected... Server shutting down..", err);

    if (server) {
        server.close(() => {
            process.exit(1)
        });
    }

    process.exit(1)
})

