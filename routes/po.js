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

const { setPo, getPo } = require('../server');

router.post('/setPo', (req, res) => {
    setPo(req.body.userData); // Set the user data received from the request body
    res.send('User data set successfully');
});

router.get('/REGISTER/po',(req,res)=>{
    res.render('REGISTER/po-reg-form/po-reg-form')
})

router.post('/register/po', (req, res) => {
    const { name, email, phone, country, state, district, institute, password, photo} = req.body;

    // Check if email or phone already exists
    mysqlConnection.query(
        'SELECT * FROM placement_officer WHERE email = ? OR phone = ?',
        [email, phone],
        (err, results) => {
            if (err) {
                console.error('Error executing query: ', err);
                res.status(500).send('Internal Server Error');
                return;
            }

            // If email or phone already exists, send a warning message
            if (results.length > 0) {
                res.render('REGISTER/po-reg-form/po-reg-form',{error:'Email or phone already exists'});
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
                    [email, password, 'placementOfficer'],
                    (err, results) => {
                        if (err) {
                            console.error('Error inserting into users table: ', err);
                            mysqlConnection.rollback(() => {
                                res.status(500).send('Internal Server Error');
                            });
                            return;
                        }

                        // Insert into placement_officer table
                        mysqlConnection.query(
                            'INSERT INTO placement_officer (name,email, phone, country, state, district, institute, password, photo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                            [name,email,phone,country,state,district,institute,password,photo],
                            (err, results) => {
                                if (err) {
                                    console.error('Error inserting into placement_officer table: ', err);
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

router.get('/po/dashboard',async(req,res)=>{
    try{
        let po = getPo()
        const profile = `/images/${po.photo}`
        const appliedStudentsCount =  await getAppliedStudentsCount(po.institute)
        const totalStudentsCount = await getTotalStudentsCount(po.institute)
        const lastAddedJob = await getLastAddedJob(po.institute)
        const pendingJobs = await getPendingJobsCount(po.institute)
        const approvedJobs = await getApprovedJobsCount(po.institute)
        
        res.render('PO/po-dashboard/po-dashboard', {
            profile,
            userName: po.name,
            mail: po.email,
            phn: po.phone,
            institute: po.institute,
            district: po.district,
            state: po.state,
            appliedStudentsCount,
            totalStudentsCount,
            lastAddedJob,
            pendingJobs,
            approvedJobs
        });
    } catch (error) {
        // Handle error
        console.error("Error:", error);
        res.status(500).send("Internal Server Error");
    }
})

function getAppliedStudentsCount(institute) {
    return new Promise((resolve, reject) => {
        mysqlConnection.query('SELECT COUNT(*) AS count FROM student WHERE institute = ? AND appliedjobs IS NOT NULL', [institute], (error, results) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(results[0].count);
        });
    });
}

function getTotalStudentsCount(institute) {
    return new Promise((resolve, reject) => {
        mysqlConnection.query('SELECT COUNT(*) AS count FROM student WHERE institute = ?', [institute], (error, results) => {
            if (error) {
                console.log(error)
                reject(error);
                return;
            }
            resolve(results[0].count);
        });
    });
}

function getLastAddedJob(institute) {
    return new Promise((resolve, reject) => {
        mysqlConnection.query('SELECT * FROM jobs WHERE institute = ? AND approved = ?', [institute,0], (error, results) => {
            if (error) {
                console.log(error)
                reject(error);
                return;
            }
            resolve(results[results.length - 1]);
        });
    });
}

function getPendingJobsCount(institute) {
    return new Promise((resolve, reject) => {
        mysqlConnection.query('SELECT COUNT(*) AS count FROM jobs WHERE institute = ? AND approved = ?', [institute,0], (error, results) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(results[0].count);
        });
    });
}

function getApprovedJobsCount(institute) {
    return new Promise((resolve, reject) => {
        mysqlConnection.query('SELECT COUNT(*) AS count FROM jobs WHERE institute = ? AND approved = ?', [institute,1], (error, results) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(results[0].count);
        });
    });
}


router.get('/PO/edit',(req,res)=>{
    let po = getPo();
    const profile = `/images/${po.photo}`
    res.render('PO/po-dashboard/poInfoEdit/poInfoEdit',{profile, po})
})

// Route to handle form submission and update user's data
router.post('/edit/po', (req, res) => {
    let po = getPo();
    const profile = `/images/${po.photo}`
    const userId = po.id;
    const { name, email, phone, state, district, institute, password } = req.body;
    const query = 'UPDATE placement_officer SET name = ?, email = ?, phone = ?, state = ?, district = ?, institute = ?, password = ? WHERE id = ?';
  
    mysqlConnection.query(query, [name, email, phone, state, district, institute, password, userId], (err, results) => {
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
        // Registration successful
        mysqlConnection.query('SELECT * FROM placement_officer WHERE id = ?', [userId],(err, results)=>{
            if (err) {
                console.error('Error executing query: ', err);
                res.status(500).send('Internal Server Error');
                return;
            }
            //setUser(results[0])
            setPo(results[0])
            //user = results[0]
            res.render('PO/po-dashboard/po-dashboard',{profile, userName:po.name,mail:po.email,phn:po.phone,institute:po.institute,district:po.district,state:po.state})
        });
        
    });
});

router.get('/po/postjobs',(req,res)=>{
    po = getPo()
    const profile = `/images/${po.photo}`
    res.render('PO/po-postJobs/po-postJobs',{profile, po})
})

router.post('/PO/postjob', (req, res) => {
    let po = getPo();
    const profile = `/images/${po.photo}`
    const { companyName, jobPost, qualification,cgpa, backlog, skill, employmentType, salaryRange, baseLocation, applicationDeadline, experienceRequired, jobDescription } = req.body;
    const institute = po.institute;

    // Check if a job with the same jobId already exists
    const selectQuery = "SELECT * FROM jobs WHERE company = ? AND post = ? AND institute = ?";
    mysqlConnection.query(selectQuery, [companyName, jobPost, institute], (err, rows) => {
        if (err) {
            console.error("Error selecting job:", err);
            res.status(500).send("Internal Server Error");
            return;
        }
        
        // If a job with the same jobId exists, return an error
        if (rows.length > 0) {
            res.render('PO/po-postJobs/po-postJobs',{error:"Job already exists.",po,profile})
            return;
        }

        // Prepare SQL statement to insert job details into the jobs table
        const sql = "INSERT INTO jobs ( company, post, qualification, cgpa, backlog, skill, type, salary, location, deadline, experience, description, approved, institute) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        // Execute the SQL statement
        mysqlConnection.query(sql, [companyName, jobPost, qualification, cgpa, backlog, skill, employmentType, salaryRange, baseLocation, applicationDeadline, experienceRequired, jobDescription, 1, institute], (err, result) => {
            if (err) {
                console.error("Error inserting job:", err);
                res.status(500).send("Error adding job");
            } else {
                res.render('PO/po-postJobs/po-postJobs',{po,profile})
            }
        });
    });
});

// Define a function to fetch listed jobs from the database
const fetchListedJobs = (institute) => {
    return new Promise((resolve, reject) => {
        // Prepare SQL statement to select jobs where approved is 1
        const sql = "SELECT * FROM jobs WHERE approved = 1 AND institute = ?";

        // Execute the SQL statement
        mysqlConnection.query(sql,[institute], (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
};

// Define a route to handle requests for fetching listed jobs
router.get('/po/listedjobs', async (req, res) => {
    po = getPo()
    const profile = `/images/${po.photo}`
    try {
        institute = po.institute
        // Fetch listed jobs using async/await
        const jobs = await fetchListedJobs(institute);

        // Render the HTML template with the fetched jobs data
        res.render('PO/po-listedJobs/po-listedJobs', { jobs,po,profile });
    } catch (error) {
        console.error('Error fetching listed jobs:', error);
        res.status(500).send('Internal Server Error');
    }
});


router.get('/po/studentlist', async (req, res) => {
    try {
        
        // Fetch PO details
        const po = getPo();
        const profile = `/images/${po.photo}`
        const institute = po.institute;

        // Fetch students belonging to the institute
        const students = await getStudentsByInstitute(institute);
        
        res.render('PO/po-studentList/po-studentList', { po, students, profile }); // Pass students data and approved jobs data to the view
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
});


router.post('/filterStudents',(req,res)=>{
    let po = getPo()
    let institute = po.institute
    const { yearOfStudy, branch, cgpa } = req.body;

    // Construct SQL query based on selected options
    let query = 'SELECT * FROM student WHERE institute = ? ';
    const queryParams = [institute];

    if (yearOfStudy) {
      query += ' AND ugyear = ?';
      queryParams.push(yearOfStudy);
    }
    if (branch) {
      query += ' AND department = ?';
      queryParams.push(branch);
    }
    if (cgpa) {
      let minCgpa,maxCgpa
      const [min, max] = cgpa.split('-');
      minCgpa = parseFloat(min);
      maxCgpa = parseFloat(max);
      query += ' AND cgpa >= ? AND cgpa <= ?';
      queryParams.push(minCgpa, maxCgpa);
    }

    // Execute the SQL query
    mysqlConnection.query(query, queryParams, (err, results) => {
      if (err) {
        console.error('Error executing query:', err);
        res.status(500).json({ error: 'An error occurred while fetching data.' });
      } else {
        res.json(results);
      }
    });
})  
  
// Function to get students by institute from the database
async function getStudentsByInstitute(institute) {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM student WHERE institute = ?`;
      mysqlConnection.query(query, [institute], (error, results) => {
        if (error) {
          reject(error);
        } else {
          resolve(results);
        }
      });
    });
}

const fetchPendingJobs = (institute) =>{
    return new Promise((resolve, reject)=>{
        const sql = "SELECT * FROM jobs WHERE approved = 0 AND institute = ?";
        mysqlConnection.query(sql,[institute], (err,results) => {
            if(err){
                reject(err)
            } else {
                resolve(results)
            }
        })
    })
}

router.get('/po/approveJobs', async (req,res)=>{
    po = getPo()
    const profile = `/images/${po.photo}`
    try{
        institute = po.institute
        const jobs = await fetchPendingJobs(institute);
        res.render('PO/po-approveJobs/po-approveJobs',{jobs,po,profile})
    }catch(error){
        console.error("Error fetching listed jobs : ", error);
        res.status(500).send('Internal Server Error');
    }
})

// Handle POST request to approve job
router.post('/approveJob', (req, res) => {
    const jobId = req.body.jobId; // assuming you're sending jobId with your request
    const sql = `UPDATE jobs SET approved = 1 WHERE jobId = ${jobId}`;
    mysqlConnection.query(sql, (err, result) => {
      if (err) throw err;
    //   console.log(`Job ${jobId} approved.`);
      res.send('Job approved successfully.');
    });
});
  
// Handle POST request to decline job
router.post('/declineJob', (req, res) => {
    const jobId = req.body.jobId; // assuming you're sending jobId with your request
    const sql = `DELETE FROM jobs WHERE jobId = ${jobId}`;
    mysqlConnection.query(sql, (err, result) => {
      if (err) throw err;
    //   console.log(`Job ${jobId} declined.`);
      res.send('Job declined and deleted successfully.');
    });
});

const fetchJob = (jobId) =>{
    return new Promise((resolve, reject)=>{
        const sql = "SELECT * FROM jobs WHERE jobId = ?";
        mysqlConnection.query(sql,[jobId], (err,results) => {
            if(err){
                reject(err)
            } else {
                resolve(results[0])
            }
        })
    })
}

router.get('/po/editJob/:jobId', async(req,res)=>{
    const po = getPo()
    const profile = `/images/${po.photo}`
    const jobId = req.params.jobId
    const job = await fetchJob(jobId)
    // console.log(job)
    res.render('PO/po-approveJobs/poJobEdit/poJobEdit',{job,po,profile})
})

router.post('/po/editJob',(req,res)=>{
    const {jobId, qualification, employmentType, salaryRange, baseLocation, applicationDeadline, experienceRequired, jobDescription, backlog, skill, cgpa} = req.body
    const query = 'UPDATE jobs SET qualification = ?, type = ?, salary = ?, location = ?, deadline = ?, experience = ?, description = ?, backlog = ?, skill = ?, cgpa = ? WHERE jobId = ?';
    mysqlConnection.query(query, [ qualification, employmentType, salaryRange, baseLocation, applicationDeadline, experienceRequired, jobDescription, backlog, skill, cgpa, jobId], (err, results) => {
        if(err) throw err;
        res.redirect('/po/approveJobs')
    })
      
})

module.exports = router