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

const { setUser, getUser } = require('../server');

router.post('/setUser', (req, res) => {
    setUser(req.body.userData); // Set the user data received from the request body
    res.send('User data set successfully');
});

router.get('/REGISTER/po',(req,res)=>{
    res.render('REGISTER/po-reg-form/po-reg-form')
})

router.post('/register/po', (req, res) => {
    const { name, email, phone, country, state, district, institute, password} = req.body;

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
                            'INSERT INTO placement_officer (name,email, phone, country, state, district, institute, password) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                            [name,email,phone,country,state,district,institute,password],
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

router.get('/po/dashboard',(req,res)=>{
    let user = getUser();
    res.render('PO/po-dashboard/po-dashboard',{userName:user.name,mail:user.email,phn:user.phone,institute:user.institute,district:user.district,state:user.state})
})

router.get('/PO/edit',(req,res)=>{
    let user = getUser();
    res.render('PO/po-dashboard/poInfoEdit/poInfoEdit',{user})
})

// Route to handle form submission and update user's data
router.post('/edit/po', (req, res) => {
    let user = getUser();
    const userId = user.id;
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
            setUser(results[0])
            user = results[0]
            res.render('PO/po-dashboard/po-dashboard',{userName:user.name,mail:user.email,phn:user.phone,institute:user.institute,district:user.district,state:user.state})
        });
        
    });
});

router.get('/po/postjobs',(req,res)=>{
    user = getUser()
    res.render('PO/po-postJobs/po-postJobs',{user})
})

router.post('/PO/postjob', (req, res) => {
    let user = getUser();
    const { jobId, companyName, jobPost, qualification, employmentType, salaryRange, baseLocation, applicationDeadline, experienceRequired, jobDescription } = req.body;
    const institute = user.institute;

    // Check if a job with the same jobId already exists
    const selectQuery = "SELECT * FROM jobs WHERE jobId = ?";
    mysqlConnection.query(selectQuery, [jobId], (err, rows) => {
        if (err) {
            console.error("Error selecting job:", err);
            res.status(500).send("Internal Server Error");
            return;
        }
        
        // If a job with the same jobId exists, return an error
        if (rows.length > 0) {
            res.render('PO/po-postJobs/po-postJobs',{error:"Job with the same jobId already exists",user})
            return;
        }

        // Prepare SQL statement to insert job details into the jobs table
        const sql = "INSERT INTO jobs (jobId, company, post, qualification, type, salary, location, deadline, experience, description, approved, institute) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        // Execute the SQL statement
        mysqlConnection.query(sql, [jobId, companyName, jobPost, qualification, employmentType, salaryRange, baseLocation, applicationDeadline, experienceRequired, jobDescription, 1, institute], (err, result) => {
            if (err) {
                console.error("Error inserting job:", err);
                res.status(500).send("Error adding job");
            } else {
                res.render('PO/po-listedJobs/po-listedJobs',{user})
            }
        });
    });
});

// Define a function to fetch listed jobs from the database
const fetchListedJobs = () => {
    return new Promise((resolve, reject) => {
        // Prepare SQL statement to select jobs where approved is 1
        const sql = "SELECT * FROM jobs WHERE approved = 1";

        // Execute the SQL statement
        mysqlConnection.query(sql, (err, results) => {
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
    user = getUser()
    try {
        // Fetch listed jobs using async/await
        const jobs = await fetchListedJobs();

        // Render the HTML template with the fetched jobs data
        res.render('PO/po-listedJobs/po-listedJobs', { jobs,user });
    } catch (error) {
        console.error('Error fetching listed jobs:', error);
        res.status(500).send('Internal Server Error');
    }
});

router.get('/po/studentlist', async (req, res) => {
    user = getUser()
    try {
      // Query database for students belonging to the institute
      const institute = user.institute;
      console.log(institute)
      const students = await getStudentsByInstitute(institute);
      console.log(students)
      res.render('PO/po-studentList/po-studentList', { students,user }); // Pass students data to the view
    } catch (error) {
      console.error('Error fetching students:', error);
      res.status(500).send('Error fetching students');
    }
});
  
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
  

module.exports = router