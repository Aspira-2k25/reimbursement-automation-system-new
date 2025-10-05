const express = require("express");
const router = express.Router();
const Form = require("../models/Form");

// POST /api/forms/submit
router.post("/submit", async (req, res) => {
  try {
    const newForm = new Form(req.body); // req.body contains your formData
    await newForm.save();
    res.status(201).json({ message: "Form saved successfully!" });
  } catch (err) {
    console.error("Error saving form:", err);
    res.status(500).json({ error: "Failed to save form" });
  }
});

module.exports = router;
