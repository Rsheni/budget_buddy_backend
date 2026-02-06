const Category = require('../../infrastructure/models/Category');

// Get Categories
const getCategories = async (req, res) => {
  try {
    const { type } = req.query;
    const categories = await Category.find({ categoryType: type || 'expense' });
    res.status(200).json(categories);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// Create Category
const createCategory = async (req, res) => {
  try {
    const newCategory = await Category.create({
      ...req.body,
      userId: "65d4f8a9e4b0a1b2c3d4e5f6"
    });
    res.status(201).json(newCategory);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// ✨ Update Category
const updateCategory = async (req, res) => {
  try {
    const updatedCategory = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true } // Return updated doc
    );
    res.status(200).json(updatedCategory);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// ✨ Delete Category
const deleteCategory = async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Category deleted" });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };