// routes/studentFormRoutes.js
const express = require("express");
const router = express.Router();
const StudentForm = require("../models/StudentForm");
const authMiddleware = require("../middleware/auth");
const upload = require("../middleware/upload");

// POST /api/student-forms/submit
router.post(
  "/submit",
  authMiddleware.verifyToken,
  upload.fields([
    { name: "nptelResult", maxCount: 1 },
    { name: "idCard", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const userId = req.user.userId || req.user.email;

      if (!userId) return res.status(400).json({ error: "User ID not found in token" });

      const newStudentForm = new StudentForm({
        ...req.body,
        userId,
        documents: [
          req.files.nptelResult
            ? { filename: req.files.nptelResult[0].filename, path: req.files.nptelResult[0].path }
            : null,
          req.files.idCard
            ? { filename: req.files.idCard[0].filename, path: req.files.idCard[0].path }
            : null,
        ].filter(Boolean),
      });

      await newStudentForm.save();
      res.status(201).json({ message: "Student form submitted successfully!", form: newStudentForm });
    } catch (err) {
      console.error("Error saving student form:", err);
      res.status(500).json({ error: "Failed to save student form", details: err.message });
    }
  }
);

module.exports = router;