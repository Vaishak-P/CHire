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

// Function to fetch the institute list asynchronously
async function getInstituteList() {
    return new Promise((resolve, reject) => {
        const query = "SELECT institute FROM placement_officer";
        mysqlConnection.query(query, (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
}
  
router.get('/comp/postjobs', async (req, res) => {
    try {
        let comp = getComp();
        let instituteList = await getInstituteList(); // Fetching institute list asynchronously
        // Extracting institute names from the result array
        const institutes = instituteList.map(row => row.institute);
        res.render('RC/rc-postJobs/rc-postJobs', { comp, institutes });
    } catch (error) {
        // Handle error
        console.error("Error fetching institute list:", error);
        res.status(500).send("Internal Server Error");
    }
});

router.post('/comp/postjob', async (req, res) => {
    try {
        let comp = getComp();
        const { jobId, jobPost, qualification, institute, cgpa, backlog, skill, employmentType, salaryRange, baseLocation, applicationDeadline, experienceRequired, jobDescription } = req.body;
        const companyName = comp.name;

        // Check if a job with the same jobId already exists
        const selectQuery = "SELECT * FROM jobs WHERE jobId = ?";
        mysqlConnection.query(selectQuery, [jobId], async (err, results) => {
            if (err) {
                console.error("Error selecting job:", err);
                res.status(500).send("Internal Server Error");
                return;
            }

            // If a job with the same jobId exists, render the page with an error message
            if (results.length > 0) {
                console.log('job exists');

                // Fetch the institute list asynchronously
                const instituteList = await getInstituteList();
                // Extract institute names from the result array
                const institutes = instituteList.map(row => row.institute);

                res.render('RC/rc-postJobs/rc-postJobs', { error:'Job with the same jobId already exists', comp, institutes });
                return;
            }

            // Prepare SQL statement to insert job details into the jobs table
            const sql = "INSERT INTO jobs (jobId, company, post, qualification, cgpa, backlog, skill, type, salary, location, deadline, experience, description, approved, institute) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

            // Execute the SQL statement
            mysqlConnection.query(sql, [jobId, companyName, jobPost, qualification, cgpa, backlog, skill, employmentType, salaryRange, baseLocation, applicationDeadline, experienceRequired, jobDescription, 0, institute], (err, result) => {
                if (err) {
                    console.error("Error inserting job:", err);
                    res.status(500).send("Error adding job");
                } else {
                    res.redirect('/comp/postjobs'); // Redirect to the page showing posted jobs
                }
            });
        });
    } catch (error) {
        console.error("Error posting job:", error);
        res.status(500).send("Error posting job");
    }
});




// router.get('/comp/listedjobs',(req,res)=>{
//     res.render('RC/rc-listedJobs/rc-listedJobs')
// })

// router.get('/comp/appliedStudentList',(req,res)=>{
//     res.render('RC/rc-studentList/rc-studentList')
// })

module.exports = router