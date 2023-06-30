const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const date = require(__dirname + "/date.js");

const app = express();
app.set('view engine', 'ejs');
app.use(express.static("public"))
app.use(bodyParser.urlencoded({ extended: true }));

mongoose.connect("mongodb://127.0.0.1:27017/todolistDB", {
    useNewUrlParser: true,
    useUnifiedTopology: true
})

const itemSchema = new mongoose.Schema({
    name: String
})

const Item = mongoose.model("Item", itemSchema);

const defaultItems = [
    { name: "Welcome to your todolist!" },
    { name: "Hit the + button to add a new item." },
    { name: "<-- Hit this to delete an item." }
]

app.get('/', (req, res) => {
    const formatedDate = date.getDate();

    Item.find({})
        .then((items) => {

            if (items.length === 0) {
                Item.insertMany(defaultItems)
                    .then(() => { console.log("Default Items Inserted Successfully") })
                    .catch(error => { console.log("Error Inserting Documents: ", err) });
            }

            res.render("list", { listTitle: formatedDate, listArray: items });
        })
        .catch(err => {
            consolr.log("Error Finding Documents: ", err);
        })
});

app.post('/', (req, res) => {

    const item = new Item({ name: req.body.newItem })

    item.save()
        .then(() => {
            console.log("New item inserted into database");
            res.redirect('/');
        }).catch(err => { console.log(err) });
});

app.post('/delete', (req, res) => {
    Item.deleteOne({ _id: req.body.checkboxID })
        .then(() => { res.redirect('/'); })
        .catch(err => { console.log("Cannot Delete Item") })

})

app.listen(3000, () => {
    console.log("Server Listening on port 3000");
});