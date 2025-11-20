module.exports = {
    apps: [{
        name: "overtime_easy",
        script: "./server.js",
        env_production: {
            NODE_ENV: "production",
            PORT: 3000
        }
    }]
};
