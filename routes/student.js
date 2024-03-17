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

router.get('/REGISTER/student',(req,res)=>{
    res.render('REGISTER/stud-reg-form/reg-form')
})

router.post('/register/student', (req, res) => {
    const { name, phone, email, softskills, password, photo } = req.body;
    const softskillsString = JSON.stringify(softskills);

    mysqlConnection.query(
        'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
        [email, password, 'student'],
        (err, results) => {
            if (err) {
                console.error('Error executing query: ', err);
                res.status(500).send('Internal Server Error');
                return;
            }
        }
    );

    mysqlConnection.query(
        'INSERT INTO student (photo, name, phone, email, password, softskills, address, blood_group, cgpa, sem) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [photo, name, phone, email, password, softskillsString, "hjaskd", "a+", 3.5, 7],
        (err, results) => {
            if (err) {
                console.error('Error executing query: ', err);
                res.status(500).send('Internal Server Error');
                return;
            }

            // Registration successful
            res.redirect('/LOGIN');
        }
    );

});


router.get('/student/dashboard',(req,res)=>{
    res.render('std-dashboard/std-dashboard', {userName:user.name,cgpa:user.cgpa,sem:user.sem,test:user.mocktest_score,fluency:user.fluency_score,internships:user.internships,phn:user.phone,mail:user.email,address:user.address,bld:user.blood_group,total:user.total })
})

router.get('/student/cv',(req,res)=>{
    res.render("cv-gen/cv-gen")
})

router.get('/cv-template',(req,res)=>{
    res.render("cv-gen/cv-template")
})

router.get('/student/mocktest',(req,res)=>{
    res.render("std-test/std-test")
})


module.exports = router