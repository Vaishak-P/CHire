const mysql = require('mysql');
const express = require('express');
const bodyparser = require('body-parser');
const path = require('path');

const app = express();

// Set view engine and configure body-parser
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'CHireMain'));
app.use(bodyparser.urlencoded({ extended: true }));

// Set up static files middleware
app.use(express.static(path.join(__dirname, 'CHireMain')));

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something went wrong!');
});

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
let student = {}
let po = {}
let comp = {}

const setStudent = (userData) => {
    student = userData;
};

const setPo = (userData) => {
    po = userData;
};

const setComp = (userData) => {
    comp = userData;
};

const getStudent = () => {
    return student;
};

const getPo = () => {
    return po;
};

const getComp = () => {
    return comp;
};

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
                    setStudent(results[0])
                    // Parse JSON strings into JavaScript objects
                    res.redirect('/student/dashboard')
                });
                break;
            case 'placementOfficer':
                // Redirect to placement coordinator dashboard
                mysqlConnection.query('SELECT * FROM placement_officer WHERE email = ?', email,(err, results)=>{
                    if (err) {
                        console.error('Error executing query: ', err);
                        res.status(500).send('Internal Server Error');
                        return;
                    }
                    setPo(results[0])
                    //user = results[0];
                    res.render('PO/po-dashboard/po-dashboard',{userName:po.name,mail:po.email,phn:po.phone,institute:po.institute,district:po.district,state:po.state});
                });
                break;
            case 'company':
                mysqlConnection.query('SELECT * FROM company WHERE email = ?', email,(err, results)=>{
                    if (err) {
                        console.error('Error executing query: ', err);
                        res.status(500).send('Internal Server Error');
                        return;
                    }
                    setComp(results[0])
                // Redirect to company HR dashboard
                res.redirect('/comp/dashboard');
                });
                break;
            default:
                // Handle unknown designation
                res.status(500).send('Unknown user designation');
        }

    });
});

app.get('/MockTest/:heading', (req, res) => {
    const encodedHeading = req.params.heading;
    const decodedHeading = decodeURIComponent(encodedHeading);
    res.render("std-test-details/std-test-details",{heading:decodedHeading})
});

// Export user variable after it has been assigned a value
module.exports = { setStudent, setPo, setComp, getStudent, getPo, getComp };

const studentRouter = require('./routes/student');
const poRouter = require('./routes/po');
const compRouter = require('./routes/company')

app.use(studentRouter);
app.use(poRouter);
app.use(compRouter);

// Start the server
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
