const mysql = require('mysql');
const express = require('express')
const router = express.Router()

// MySQL Connection Configuration
const mysqlConnection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Akshay@123',
    database: 'cleverhire'
});

const { setComp, getComp } = require('../server');

router.post('/setComp', (req, res) => {
    setPo(req.body.userData); // Set the user data received from the request body
    res.send('User data set successfully');
});

router.get('/REGISTER/company',(req,res)=>{
    res.render('REGISTER/comp-reg-form/comp-reg-form')
})

router.post('/register/company', (req, res) => {
    const { companyName, email, contactName, phone, contactEmail, companyUrl, address1, address2, address3, state, district, password, photo} = req.body;

    // Check if email or phone already exists
    mysqlConnection.query(
        'SELECT * FROM company WHERE email = ? OR phone = ?',
        [email, phone],
        (err, results) => {
            if (err) {
                console.error('Error executing query: ', err);
                res.status(500).send('Internal Server Error');
                return;
            }

            // If email or phone already exists, send a warning message
            if (results.length > 0) {
                res.render('REGISTER/comp-reg-form/comp-reg-form',{error:'Email or phone already exists'});
                return;
            }

            // Begin transaction
            mysqlConnection.beginTransaction((err) => {
                if (err) {
                    console.error('Error starting transaction: ', err);
                    res.status(500).send('Internal Server Error');
                    return;
                }

                // Insert into users table
                mysqlConnection.query(
                    'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
                    [email, password, 'company'],
                    (err, results) => {
                        if (err) {
                            console.error('Error inserting into users table: ', err);
                            mysqlConnection.rollback(() => {
                                res.status(500).send('Internal Server Error');
                            });
                            return;
                        }

                        // Insert into company table
                        mysqlConnection.query(
                            'INSERT INTO company (name, email, contactName, phone, contactEmail, url, address1, address2, address3, state, district, password, photo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                            [companyName,email,contactName,phone,contactEmail,companyUrl,address1,address2,address3,state,district,password,photo],
                            (err, results) => {
                                if (err) {
                                    console.error('Error inserting into company table: ', err);
                                    mysqlConnection.rollback(() => {
                                        res.status(500).send('Internal Server Error');
                                    });
                                    return;
                                }

                                // Commit transaction if everything is successful
                                mysqlConnection.commit((err) => {
                                    if (err) {
                                        console.error('Error committing transaction: ', err);
                                        mysqlConnection.rollback(() => {
                                            res.status(500).send('Internal Server Error');
                                        });
                                        return;
                                    }
                                    
                                    // Registration successful
                                    res.redirect('/LOGIN');
                                });
                            }
                        );
                    }
                );
            });
        }
    );
});

router.get('/comp/dashboard',(req,res)=>{
    let comp = getComp()
    res.render('RC/rc-dashboard/rc-dashboard',{comp})
})

module.exports = router