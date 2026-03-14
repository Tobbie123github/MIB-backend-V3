// index.js
require("dotenv").config();

// Run the Express server
require("./server");

// Run the Agenda worker
require("./workers/agendaWorker");
