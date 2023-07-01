const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");
const date = require(__dirname + "/date.js");
require('dotenv').config();

const app = express();
app.set('view engine', 'ejs');
app.use(express.static("public"))
app.use(bodyParser.urlencoded({ extended: true }));

const URL = `mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@cluster0.mtwlrzs.mongodb.net/todolistDB`;
mongoose.connect(URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});


const itemSchema = new mongoose.Schema({
    name: String
})

const Item = mongoose.model("Item", itemSchema);

const defaultItems = [
    { name: "Welcome to your todolist!" }
]

const listSchema = {
    name: String,
    items: [itemSchema]
}

const List = mongoose.model('List', listSchema);

const formatedDate = date.getDate();
app.get('/', (req, res) => {

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

app.get('/:customListName', (req, res) => {
    const customListName = _.capitalize(req.params.customListName);

    List.findOne({ name: customListName })
        .then((foundList) => {
            if (foundList) {
                // Show an existing list
                res.render("list", { listTitle: foundList.name, listArray: foundList.items });
            } else {
                // Create a new list
                const listItem = new List({
                    name: customListName,
                    items: defaultItems
                })
                listItem.save()
                    .then(() => { console.log("New List Created.") })
                    .catch(err => { console.log("Error creating new list.") });

                res.redirect(`/${customListName}`);
            }
        })
        .catch((err) => {
            console.log("Error Finding in List Collection");
        });
});

app.post('/', (req, res) => {
    const newItem = req.body.newItem;
    const listName = req.body.listbutton;

    if (newItem === null || newItem === undefined || newItem.trim() === "") {
        res.redirect(`/${listName}`);
    } else {
        const item = new Item({ name: newItem });

        if (listName === formatedDate) {
            item.save()
                .then(() => {
                    console.log("New Item Added to Default List");
                    res.redirect('/');
                })
                .catch(err => {
                    console.log("Error Inserting:", err);
                    // Handle the error here (e.g., redirect to an error page)
                });
        } else {
            List.findOneAndUpdate(
                { name: listName },
                { $push: { items: item } },
                { new: true }
            )
                .then(updatedList => {
                    if (updatedList) {
                        console.log("New Item Added to Custom List");
                        res.redirect('/' + listName);
                    } else {
                        console.log("Custom List Not Found");
                        // Handle the case when the custom list is not found
                        // (e.g., redirect to an error page)
                    }
                })
                .catch(err => {
                    console.log("Error finding/updating Custom List:", err);
                    // Handle the error here (e.g., redirect to an error page)
                });
        }
    }
});

app.post('/delete', (req, res) => {

    const checkboxID = req.body.checkboxID;
    const listName = req.body.listName;

    if (listName === formatedDate) {
        Item.deleteOne({ _id: checkboxID })
            .then(() => {
                console.log("Item deleted from database");
                res.redirect('/');
            }).catch(err => { console.log(err) });
    } else {
        List.findOneAndUpdate(
            { name: listName },
            { $pull: { items: { _id: checkboxID } } }
        )
            .then(() => {
                console.log("Item removed from the list");
                res.redirect('/' + listName);
            })
            .catch(err => {
                console.log("Error removing item from the list:", err);
                // Handle the error here (e.g., redirect to an error page)
            });
    }
})


app.listen(process.env.PORT || 3000, () => {
    console.log("Server Listening on port 3000");
});