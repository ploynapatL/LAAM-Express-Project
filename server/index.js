const { createApp } = require("./app");
const allowedOrigins = process.env.FRONTEND_ORIGINS ? process.env.FRONTEND_ORIGINS.split(",").map(s => s.trim()).filter(Boolean) : undefined;
const app = createApp({ allowedOrigins });
const port = process.env.PORT || 3001;
app.listen(port, () => console.log("Demo tracking API on http://localhost:" + port));
