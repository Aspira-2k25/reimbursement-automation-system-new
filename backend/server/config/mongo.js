const mongoose =  require("mongoose");

const connectMongoDB = async () => {
    try {
        await mongoose.connect("mongodb://localhost:27017/reimbursement", {
           useNewUrlParser: true,
           useUnifiedTopology: true, 
        });
        console.log("mongodb connected");
    }  catch(err) {
        console.log("mongobd connection error", err);
        process.exit(1);
    }
};

module.exports = connectMongoDB;