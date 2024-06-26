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

router.get('/comp/dashboard',async(req,res)=>{
    let comp = getComp()
    const profile = `/images/${comp.photo}`
    try{
        const jobsCount =  await getjobsCount(comp.name)
        const lastAddedJob = await getLastAddedJob(comp.name)
        const studInstCount = await getStudentsAndUniqueInstitutesCount(comp.name)
        
        res.render('RC/rc-dashboard/rc-dashboard',{comp,profile,jobsCount,lastAddedJob,studInstCount})
    } catch (error) {
        // Handle error
        console.error("Error:", error);
        res.status(500).send("Internal Server Error");
    }
})

function getjobsCount(company) {
    return new Promise((resolve, reject) => {
        mysqlConnection.query('SELECT COUNT(*) AS count FROM jobs WHERE company = ?', [company], (error, results) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(results[0].count);
        });
    });
}

function getLastAddedJob(company) {
    return new Promise((resolve, reject) => {
        mysqlConnection.query('SELECT * FROM jobs WHERE company = ?', [company], (error, results) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(results[results.length - 1]);
        });
    });
}

function getStudentsAndUniqueInstitutesCount(company) {
    return new Promise((resolve, reject) => {
        // First, query the jobs table to get the jobId's corresponding to the specified company
        mysqlConnection.query(`SELECT jobId FROM jobs WHERE company = ?`, [company], (error, jobResults) => {
            if (error) {
                reject(error);
                return;
            }
            // Extracting jobId's from jobResults
            const jobIds = jobResults.map(row => row.jobId);

            // Now query the student table to count the number of students who have applied to those jobs
            mysqlConnection.query(`SELECT COUNT(*) AS studentCount, COUNT(DISTINCT institute) AS uniqueInstitutesCount FROM student WHERE CONCAT(',', appliedJobs, ',') REGEXP ',(${jobIds.join('|')})[,|$]'`, [jobIds.join()], (error, studentResults) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(studentResults[0]);
            });
        });
    });
}


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
        const { jobPost, qualification, institute, cgpa, backlog, skill, employmentType, salaryRange, baseLocation, applicationDeadline, experienceRequired, jobDescription } = req.body;
        const companyName = comp.name;

        // Check if a job with the same jobId already exists
        const selectQuery = "SELECT * FROM jobs WHERE post = ? AND institute = ? AND company = ?";
        mysqlConnection.query(selectQuery, [jobPost,institute,companyName], async (err, results) => {
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

                res.render('RC/rc-postJobs/rc-postJobs', { error:'Job already exists', comp, institutes, profile });
                return;
            }

            // Prepare SQL statement to insert job details into the jobs table
            const sql = "INSERT INTO jobs ( company, post, qualification, cgpa, backlog, skill, type, salary, location, deadline, experience, description, approved, institute) VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

            // Execute the SQL statement
            mysqlConnection.query(sql, [ companyName, jobPost, qualification, cgpa, backlog, skill, employmentType, salaryRange, baseLocation, applicationDeadline, experienceRequired, jobDescription, 0, institute], (err, result) => {
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

// Handle POST request to delete job
router.post('/comp/deleteJob', (req, res) => {
    const jobId = req.body.jobId; // assuming you're sending jobId with your request
    const sql = `DELETE FROM jobs WHERE jobId = ${jobId}`;
    mysqlConnection.query(sql, (err, result) => {
      if (err) throw err;
      res.send('Job deleted successfully.');
    });
});

const getStudents = async (company) => {
    return new Promise((resolve, reject) => {
        const query = `
        SELECT DISTINCT s.*, j.post
        FROM student s
        JOIN jobs j ON FIND_IN_SET(j.jobId, s.appliedJobs)
        WHERE j.company = ?
    `;
        mysqlConnection.query(query, [company], (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
};


const getJobPost = async (company) =>{
    return new Promise((resolve, reject)=>{
        const query = 'SELECT post FROM jobs WHERE company = ?'
        mysqlConnection.query(query, [company], (error,results)=>{
            if(error){
                reject(error)
            }else{
                resolve(results)
            }
        })
    })
}

router.get('/comp/appliedStudentList', async (req, res) => {
    try {
        
        // Fetch PO details
        const comp = getComp();
        const profile = `/images/${comp.photo}`
        const company = comp.name;
        // Fetch students belonging to the institute
        const studentsWithJobs = await getStudents(company);
        const students = studentsWithJobs.map(student => ({
            ...student,
            post: student.post
        }));

        let instituteList = await getInstituteList(); // Fetching institute list asynchronously
        let jobPostsList = await getJobPost(company)
        // Extracting institute names from the result array
        const institutes = instituteList.map(row => row.institute);
        const jobPosts  = jobPostsList.map(row => row.post);
        res.render('RC/rc-studentList/rc-studentList', { profile, comp, students, institutes, jobPosts }); // Pass students data and approved jobs data to the view
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
});

router.post('/comp/filterStudents', (req, res) => {
    let comp = getComp();
    let company = comp.name;
    const { institute, jobPost } = req.body;

    // Initialize the base query
    let query = 'SELECT s.*, j.post AS jobPost FROM student s LEFT JOIN jobs j ON FIND_IN_SET(j.jobId, s.appliedjobs)';

    let queryParams = [];

    // Add conditions based on the selected institute and job post
    if (institute && jobPost) {
        query += ' WHERE s.institute = ? AND j.company = ? AND j.post = ?';
        queryParams.push(institute, company, jobPost);
    } else if (institute) {
        query += ' WHERE s.institute = ? AND j.company = ?';
        queryParams.push(institute, company);
    } else if (jobPost) {
        query += ' WHERE j.company = ? AND j.post = ?';
        queryParams.push(company, jobPost);
    }

    mysqlConnection.query(query, queryParams, (err, results) => {
        if (err) {
            console.error('Error executing student query:', err);
            res.status(500).json({ error: 'An error occurred while fetching student data.' });
        } else {
            res.json(results);
        }
    });
});




module.exports = router