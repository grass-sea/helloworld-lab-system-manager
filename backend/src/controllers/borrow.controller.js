const borrowService = require(
  "../services/borrow.service"
);

const createBorrowRequest = async (req, res, next) => {

  try {

    createBorrowSchema.parse(req.body);

    const result =
      await borrowService.createBorrowRequest(
        req.user.id,
        req.body.items
      );

    res.status(201).json({
      success: true,
      data: result
    });

  } catch (error) {

    next(error);

  }

};

const approveBorrowRequest = async (req, res) => {

  try {

    const result =
      await borrowService.approveBorrowRequest(
        req.params.id
      );



    res.json({
      success: true,
      data: result
    });

  } catch (error) {

    res.status(500).json({

      success: false,
      message: error.message

    });

  }

};

const returnBorrowRequest = async (req, res) => {

  try {

    const result =
      await borrowService.returnBorrowRequest(
        req.params.id
      );



    res.json({
      success: true,
      data: result
    });

  } catch (error) {

    res.status(500).json({

      success: false,
      message: error.message

    });

  }

};

const {
  createBorrowSchema
} = require("../validators/borrow.validator");

const getBorrowHistory = async (req, res) => {

  try {

    const result =
      await borrowService.getBorrowHistory();

    res.json({

      success: true,
      data: result

    });

  } catch (error) {

    res.status(500).json({

      success: false,
      message: error.message

    });

  }

};

module.exports = {
  createBorrowRequest,
  approveBorrowRequest,
  returnBorrowRequest,
  getBorrowHistory
};