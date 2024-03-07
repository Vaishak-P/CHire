const mysql = require('mysql');
const express = require('express');
const bodyparser = require('body-parser');
const path = require('path');
const { error } = require('console');

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

app.get('/LOGIN',(req,res)=>{
    res.render('LOGIN/login')
})

app.get('/LOGOUT',(req,res)=>{
    res.render('index')
})

//For storing student details
let user = {};

// Login authentication route
app.post('/LOGIN', (req, res) => {
    const email = req.body.email;
    const password = req.body.psw;
    mysqlConnection.query('SELECT * FROM users WHERE email = ?', email, (err, results) => {
        if (err) {
            console.error('Error executing query: ', err);
            res.status(500).send('Internal Server Error');
            return;
        }

        if (results.length === 0) {
            // User not found
            res.status(401).render('LOGIN/login', { error: 'Invalid credentials! Please try again.' });
            return;
        }

        const login = results[0];

        if (login.password !== password) {
            // Incorrect password
            res.status(401).render('LOGIN/login', { error: 'Invalid credentials! Please try again.' });
            return;
        }

        // Authentication successful

         // Redirect based on user's role
         switch (login.role) {
            case 'student':
                // Redirect to student dashboard
                mysqlConnection.query('SELECT * FROM student WHERE email = ?', email,(err, results)=>{
                    if (err) {
                        console.error('Error executing query: ', err);
                        res.status(500).send('Internal Server Error');
                        return;
                    }
                    
                    user = results[0]
                    res.render('std-dashboard/std-dashboard', {userName:user.name,cgpa:user.cgpa,sem:user.sem,test:user.mocktest_score,fluency:user.fluency_score,internships:user.internships,phn:user.phone,mail:user.email,address:user.address,bld:user.blood_group,total:user.total });
                });
                break;
            case 'placement_coordinator':
                // Redirect to placement coordinator dashboard
                res.redirect('/placement-coordinator/dashboard');
                break;
            case 'company':
                // Redirect to company HR dashboard
                res.redirect('/company-hr/dashboard');
                break;
            default:
                // Handle unknown designation
                res.status(500).send('Unknown user designation');
        }

    });
});

app.get('/student/dashboard',(req,res)=>{
    res.render('std-dashboard/std-dashboard', {userName:user.name,cgpa:user.cgpa,sem:user.sem,test:user.mocktest_score,fluency:user.fluency_score,internships:user.internships,phn:user.phone,mail:user.email,address:user.address,bld:user.blood_group,total:user.total })
})

app.get('/student/cv',(req,res)=>{
    res.render("cv-gen/cv-gen")
})

app.get('/cv-template',(req,res)=>{
    res.render("cv-gen/cv-template")
})

app.get('/student/mocktest',(req,res)=>{
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
