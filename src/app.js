// Import required dependencies
import express from 'express';
import multer from 'multer';
import session from 'express-session';
import path from 'path'; // Using full path module for simplicity
import { fileURLToPath } from 'url';
import fsPromises from 'fs/promises'; // For async methods
import fs from 'fs'; // For synchronous methods like existsSync
import crypto from 'crypto';
import chalk from 'chalk';

// Define __dirname and __filename for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Application Configuration
const app = express();
const port = 3000;
// User credentials for basic authentication
const users = {
  user: "asdf",
};

// Initialize upload directory
// Define upload directory
const uploadDir = path.join(__dirname, "..", "uploads");

// Check if uploadDir exists, create it if it doesn’t
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
// Session Configuration
app.use(
  session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }, // Set to true if using HTTPS
  })
);

// Authentication Middleware
const isAuthenticated = (req, res, next) => {
  // Allow access to login page, and uploaded files without authentication
  if (
    req.session.isAuthenticated ||
    req.path === "/login" ||
    req.path.startsWith("/uploads")
  ) {
    return next();
  }
  res.redirect("/login");
};

// Middleware Setup
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads"))); // Serve uploaded files
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(isAuthenticated); // Apply authentication check
app.use(express.static(__dirname)); // Serve static files from src directory

// Multer Configuration for File Upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "..", "uploads"));
  },
  filename: (req, file, cb) => {
    // Generate temporary filename to prevent conflicts
    const tempName = `temp-${crypto
      .randomBytes(6)
      .toString("hex")}${path.extname(file.originalname)}`;
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleString("en-US", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    console.log(
      chalk.magentaBright(
        "------------------- ↓ " + formattedDate + " ↓ -------------------"
      )
    );
    console.log(
      chalk.blueBright("[UPLOAD] Using temporary filename:"),
      chalk.cyanBright(tempName)
    );
    cb(null, tempName);
  },
});

// File type validation
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "video/mp4",
    "video/webm",
    "video/ogg",
    "video/quicktime",
    "video/x-msvideo",
    "video/x-matroska",
    "video/3gpp",
    "video/x-flv",
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Only video files (mp4, webm, ogg, mov, avi, mkv, 3gp, flv) are allowed"
      )
    );
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 600 * 1024 * 1024 }, // 600MB file size limit
});

// Authentication Routes
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  console.log(
    chalk.yellowBright(
      `[LOGIN] Login attempt: username: ${username}, password: ${password}`
    )
  );
  if (users[username] && users[username] === password) {
    req.session.isAuthenticated = true;
    res.redirect("/");
  } else {
    res.redirect("/login?error=Invalid+credentials");
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

// Main Application Routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Video Management Routes
app.get("/videos", (req, res) => {
  // console.log('Received request for /videos');
  const uploadsPath = path.join(__dirname, "..", "uploads");
  fs.readdir(uploadsPath, (err, files) => {
    if (err) {
      console.error("Error reading uploads directory:", err);
      return res.status(500).json({
        success: false,
        message: "Error reading uploads directory",
      });
    }
    const videoFiles = files.filter((file) =>
      /\.(mp4|webm|ogg|mov|avi|mkv|3gp|flv)$/i.test(file)
    );
    const videoList = videoFiles.map((file) => ({
      filename: file,
      url: `${req.protocol}://${req.get("host")}/uploads/${file}`,
      uploadDate: fs.statSync(path.join(uploadsPath, file)).mtime.toISOString(),
    }));
    res.json({
      success: true,
      videos: videoList,
    });
  });
});

app.post("/delete", (req, res) => {
  const { filename } = req.body;
  if (!filename) {
    return res.status(400).json({
      success: false,
      message: "Filename is required",
    });
  }

  const filePath = path.join(__dirname, "..", "uploads", filename);
  fs.unlink(filePath, (err) => {
    if (err) {
      console.error("Error deleting file:", err);
      return res.status(500).json({
        success: false,
        message: `Error deleting file: ${err.message}`,
      });
    }
    res.json({
      success: true,
      message: "File deleted successfully",
    });
  });
});

app.post("/upload", upload.single("video"), (req, res) => {
  // console.log('Post-multer req.body:', req.body);
  try {
    if (!req.file) {
      console.error("No file uploaded");
      return res.status(400).json({
        success: false,
        message: "No file selected",
      });
    }

    const tempPath = req.file.path;
    const fileExt = path.extname(req.file.originalname);
    const customName = req.body.title ? req.body.title.trim() : "";
    let finalName;

    console.log(
      chalk.blueBright("[UPLOAD] Received custom filename:"),
      chalk.cyan(customName)
    );

    if (customName) {
      const cleanName = customName.replace(/[^a-zA-Z0-9-_]/g, "");
      if (cleanName.length > 50) {
        fs.unlinkSync(tempPath); // Clean up temp file
        console.error("Filename too long:", cleanName);
        return res.status(400).json({
          success: false,
          message: "Filename must be 50 characters or less",
        });
      }
      if (!cleanName) {
        fs.unlinkSync(tempPath);
        console.error("Invalid filename after cleaning:", customName);
        return res.status(400).json({
          success: false,
          message: "Filename contains invalid characters",
        });
      }
      finalName = `${cleanName}${fileExt}`;
    } else {
      const randomStr = crypto.randomBytes(6).toString("hex");
      finalName = `${randomStr}${fileExt}`;
      console.log(
        chalk.blueBright("[UPLOAD] Using random filename:"),
        chalk.cyan(finalName)
      );
    }

    const finalPath = path.join(uploadDir, finalName);

    // Check if final filename already exists
    if (fs.existsSync(finalPath)) {
      fs.unlinkSync(tempPath);
      console.error(chalk.redBright("File already exists:", finalName));
      return res.status(400).json({
        success: false,
        message: "A file with this name already exists",
      });
    }

    // Rename the temporary file to the final name
    fs.renameSync(tempPath, finalPath);
    console.log(
      chalk.blueBright("[UPLOAD] Renamed file to:"),
      chalk.cyan(finalName)
    );

    const videoUrl = `${req.protocol}://${req.get(
      "host"
    )}/uploads/${finalName}`;
    const uploadDate = new Date().toISOString();
    console.log(
      chalk.greenBright("[SUCCESS] File uploaded successfully:"),
      chalk.cyanBright(finalName)
    );
    res.json({
      success: true,
      message: "Successful!",
      videoUrl: videoUrl,
      uploadDate: uploadDate,
      filename: finalName,
    });
  } catch (error) {
    console.error("Upload error:", error.message);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path); // Clean up temp file on error
    }
    res.status(500).json({
      success: false,
      message: "Error upload file: " + error.message,
    });
  }
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error("Middleware error:", err.message);
  if (req.file && fs.existsSync(req.file.path)) {
    fs.unlinkSync(req.file.path); // Clean up temp file on multer error
  }
  res.status(500).json({
    success: false,
    message: "Something went wrong: " + err.message,
  });
});

// Start Server
app.listen(port, () => {
  console.log(
    chalk.greenBright(`[SERVER] Server running at http://localhost:${port}`)
  );
});
