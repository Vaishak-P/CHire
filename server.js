const mysql = require('mysql');
const express = require('express');
const bodyparser = require('body-parser');
const path = require('path');

var app = express();

// Set view engine and configure body-parser
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'CHireMain'));
app.use(bodyparser.urlencoded({ extended: true }));

// Set up static files middleware
app.use(express.static(path.join(__dirname, 'CHireMain')));

// MySQL Connection Configuration
const mysqlConnection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Akshay@123',
    database: 'cleverhire'
});

mysqlConnection.connect((err) => {
    if (!err)
        console.log('DB connection succeeded.');
    else
        console.log('DB connection failed \n Error: ' + JSON.stringify(err, undefined, 2));
});

app.get('/',(req,res)=>{
    res.render('index')
})

// Login authentication route
app.post('/LOGIN/login.html', (req, res) => {
    const email = req.body.email;
    const password = req.body.psw;
    mysqlConnection.query('SELECT * FROM student WHERE email = ?', email, (err, results) => {
        if (err) {
            console.error('Error executing query: ', err);
            res.status(500).send('Internal Server Error');
            return;
        }

        if (results.length === 0) {
            // User not found
            //res.status(401).render('D:/backend/CHire-main/index', { error: 'Invalid credentials. Please try again.' });
            res.status(401).send('Invalid username or password');
            return;
        }

        const user = results[0];
        if (user.password !== password) {
            // Incorrect password
            res.status(401).send('Invalid username or password');
            return;
        }

        // Authentication successful
        // Render the EJS file with the user's details
        res.render('std-dashboard/std-dashboard', {userName:user.name,cgpa:user.cgpa,sem:user.sem,test:user.mocktest_score,fluency:user.fluency_score,internships:user.internships,phn:user.phone,mail:user.email,address:user.address,bld:user.blood_group,total:user.total });
    });
});

app.get('/CV',(req,res)=>{
    res.render("cv-gen/cv-gen")
})

app.get('/cv-template',(req,res)=>{
    res.render("cv-gen/cv-template")
})

app.get('/MockTest',(req,res)=>{
    res.render("std-test/std-test")
})

app.get('/MockTest/:heading', (req, res) => {
    const encodedHeading = req.params.heading;
    const decodedHeading = decodeURIComponent(encodedHeading);
    res.render("std-test-details/std-test-details",{heading:decodedHeading})
});

// Start the server
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
