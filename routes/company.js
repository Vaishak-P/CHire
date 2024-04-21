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
    const profile = `/images/${comp.photo}`
    res.render('RC/rc-dashboard/rc-dashboard',{comp,profile})
})

router.get('/comp/edit',(req,res)=>{
    let comp =getComp()
    const profile = `/images/${comp.photo}`
    res.render('RC/rc-dashboard/rcInfoEdit/rcInfoEdit',{comp,profile})
})

// Route to handle form submission and update user's data
router.post('/edit/comp', (req, res) => {
    let comp = getComp();
    const profile = `/images/${comp.photo}`
    const userId = comp.id;
    const { companyName, email, contactName, phone, contactEmail, companyUrl, address1, address2, address3, state, district, password } = req.body;
    const query = 'UPDATE company SET name = ?, email = ?, contactName = ?, phone = ?, contactEmail = ?, url = ?, address1 = ?, address2 = ?, address3 = ?, state = ?, district = ?, password = ? WHERE id = ?';
  
    mysqlConnection.query(query, [companyName, email, contactName, phone, contactEmail, companyUrl, address1, address2, address3, state, district, password, userId], (err, results) => {
      if (err) {
        console.error('Error updating user:', err);
        res.status(500).send('Error updating user');
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
        })
        // Updation successful
        mysqlConnection.query('SELECT * FROM company WHERE id = ?', [userId],(err, results)=>{
            if (err) {
                console.error('Error executing query: ', err);
                res.status(500).send('Internal Server Error');
                return;
            }
            setComp(results[0])
            comp = getComp()
            res.render('RC/rc-dashboard/rc-dashboard',{comp,profile})
        });
        
    });
});

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
        const profile = `/images/${comp.photo}`
        let instituteList = await getInstituteList(); // Fetching institute list asynchronously
        // Extracting institute names from the result array
        const institutes = instituteList.map(row => row.institute);
        res.render('RC/rc-postJobs/rc-postJobs', { comp, institutes, profile });
    } catch (error) {
        // Handle error
        console.error("Error fetching institute list:", error);
        res.status(500).send("Internal Server Error");
    }
});

router.post('/comp/postjob', async (req, res) => {
    try {
        let comp = getComp();
        const profile = `/images/${comp.photo}`
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

                res.render('RC/rc-postJobs/rc-postJobs', { error:'Job with the same jobId already exists', comp, institutes, profile });
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
                    res.redirect('/comp/listedjobs'); // Redirect to the page showing posted jobs
                }
            });
        });
    } catch (error) {
        console.error("Error posting job:", error);
        res.status(500).send("Error posting job");
    }
});

// Define a function to fetch listed jobs from the database
const fetchListedJobs = (company) => {
    return new Promise((resolve, reject) => {
        // Prepare SQL statement to select jobs where approved is 1
        const sql = "SELECT * FROM jobs WHERE company = ?";

        // Execute the SQL statement
        mysqlConnection.query(sql,[company], (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
};

// Define a route to handle requests for fetching listed jobs
router.get('/comp/listedjobs', async (req, res) => {
    comp = getComp()
    const profile = `/images/${comp.photo}`
    try {
        company = comp.name
        // Fetch listed jobs using async/await
        const jobs = await fetchListedJobs(company);
        res.render('RC/rc-listedJobs/rc-listedJobs', { jobs,comp,profile });
    } catch (error) {
        console.error('Error fetching listed jobs:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Function to get students whose applied job matches the company's name
const getStudents = async (company) => {
    return new Promise((resolve, reject) => {
        const query = 'SELECT * FROM student WHERE JSON_CONTAINS(appliedJobs, ?)';
        mysqlConnection.query(query, [JSON.stringify(company)], (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
};


router.get('/comp/appliedStudentList', async (req, res) => {
    try {
        
        // Fetch PO details
        const comp = getComp();
        const profile = `/images/${comp.photo}`
        const company = comp.name;

        // Fetch students belonging to the institute
        const students = await getStudents([company]);
        let instituteList = await getInstituteList(); // Fetching institute list asynchronously
        // Extracting institute names from the result array
        const institutes = instituteList.map(row => row.institute);
        
        res.render('RC/rc-studentList/rc-studentList', { profile, comp, students, institutes }); // Pass students data and approved jobs data to the view
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
});

router.post('/comp/filterStudents',(req,res)=>{
    let comp = getComp()
    let company = comp.name
    const institutes = req.body;
    const institute = Object.keys(institutes)[0];

    // Convert company to JSON array with a single element
     const companyJSON = JSON.stringify([company]);

     // Construct SQL query based on selected options
     let query = 'SELECT * FROM student WHERE institute = ? AND JSON_CONTAINS(appliedJobs, ?)';
    // Execute the SQL query
    mysqlConnection.query(query, [institute,companyJSON], (err, results) => {
      if (err) {
        console.error('Error executing query:', err);
        res.status(500).json({ error: 'An error occurred while fetching data.' });
      } else {
        res.json(results);
      }
    });
})

module.exports = router