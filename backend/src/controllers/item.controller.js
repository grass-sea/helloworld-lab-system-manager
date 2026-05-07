const itemService = require("../services/item.service");

const createItem = async (req, res) => {

  try {

    const item =
      await itemService.createItem(
        req.body
      );

    res.status(201).json({

      success: true,
      data: item

    });

  } catch (error) {

    res.status(500).json({

      success: false,
      message: error.message

    });

  }

};

const getItems = async (req, res) => {

  try {

    const items =
      await itemService.getItems();

    res.json({

      success: true,
      data: items

    });

  } catch (error) {

    res.status(500).json({

      success: false,
      message: error.message

    });

  }

};

module.exports = {

  createItem,
  getItems

};