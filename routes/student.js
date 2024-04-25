const mysql = require('mysql');
const expres = require('express')
const router = expres.Router()
const fs = require('fs');
const path = require('path');
const axios = require('axios'); // Import Axios for making HTTP requests
let flag = null
router.views = path.join(__dirname, 'CHireMain');

// Parse JSON bodies
router.use(expres.json());

// MySQL Connection Configuration
const mysqlConnection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Akshay@123',
    database: 'cleverhire'
});
// Import the setUser function from server.js
const { setStudent, getStudent } = require('../server');
//const { profile } = require('console');

router.post('/setStudent', (req, res) => {
    setStudent(req.body.userData); // Set the user data received from the request body
    res.send('User data set successfully');
});

router.get('/REGISTER/student', (req, res) => {
    res.render('REGISTER/stud-reg-form/stud-reg-form')
})

// Assuming you have a route to handle the AJAX request
router.get('/institutes', (req, res) => {
    const selectedDistrict = req.query.district;

    // Query the database for institute names sorted by district
    mysqlConnection.query(
        'SELECT institute FROM placement_officer WHERE district = ? ORDER BY institute',
        [selectedDistrict],
        (err, results) => {
            if (err) {
                console.error('Error fetching institutes:', err);
                res.status(500).json({ error: 'Internal Server Error' });
                return;
            }
            // Send the list of institute names as a response
            res.json({ institutes: results });

        }
    );
});

router.post('/register/student', (req, res) => {
    const { name, email, phone, address1, address2, address3, country, state, district, institute, department, cgpa, backlog, softskills, hardskills, password, photo, ugyear, internships } = req.body;
    const softskillsString = JSON.stringify(softskills)
    const hardskillsString = JSON.stringify(hardskills)

    // Check if email or phone already exists
    mysqlConnection.query(
        'SELECT * FROM student WHERE email = ? OR phone = ?',
        [email, phone],
        (err, results) => {
            if (err) {
                console.error('Error executing query: ', err);
                res.status(500).send('Internal Server Error');
                return;
            }

            // If email or phone already exists, send a warning message
            if (results.length > 0) {
                res.render('REGISTER/stud-reg-form/stud-reg-form', { error: 'Email or phone already exists' });
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
                    [email, password, 'student'],
                    (err, results) => {
                        if (err) {
                            console.error('Error inserting into users table: ', err);
                            mysqlConnection.rollback(() => {
                                res.status(500).send('Internal Server Error');
                            });
                            return;
                        }

                        // Insert into student table
                        mysqlConnection.query(
                            'INSERT INTO student (name, email, phone, address1, address2, address3,country, state, district, institute, cgpa, backlog, softskills, hardskills, password, photo, ugyear, internships, department) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? , ?, ?, ?, ?, ?)',
                            [name, email, phone, address1, address2, address3, country, state, district, institute, cgpa, backlog, softskillsString, hardskillsString, password, photo, ugyear, internships, department],
                            (err, results) => {
                                if (err) {
                                    console.error('Error inserting into student table: ', err);
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

router.get('/student/dashboard', async (req, res) => {
    try {
        const student = getStudent();
        const softskillsArray = JSON.parse(student.softskills);
        const hardskillsArray = JSON.parse(student.hardskills);
        const profile = `/images/${student.photo}`

        // Query to fetch matching jobs
        const sql = `SELECT * FROM jobs WHERE approved = ? AND institute = ? AND skill IN (?) AND cgpa <= ? AND backlog >= ?`;

        // Execute the query
        const jobs = await executeQuery(sql, [1, student.institute, hardskillsArray, student.cgpa, student.backlog]);

        // Render the dashboard template with fetched data
        //Parse JSON strings into JavaScript objects
        res.render('std-dashboard/std-dashboard', { userName: student.name, cgpa: student.cgpa, backlog: student.backlog, test: student.mocktest_score, fluency: student.fluency_score, internships: student.internships, phn: student.phone, mail: student.email, address1: student.address1, address2: student.address2, address3: student.address3, total: student.total, hard: hardskillsArray, soft: softskillsArray, institute: student.institute, year: student.ugyear, profile: profile, jobs });
    } catch (error) {
        console.error('Error fetching jobs:', error);
        res.status(500).send('Error fetching jobs');
    }
});

function executeQuery(sql, params) {
    return new Promise((resolve, reject) => {
        mysqlConnection.query(sql, params, (error, results) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(results);
        });
    });
}

router.get('/student/editinfo', (req, res) => {
    const student = getStudent()
    const profile = `/images/${student.photo}`
    res.render('std-dashboard/stdInfoEdit/stdInfoEdit', { student, profile })
})

router.post('/edit/student', (req, res) => {
    let student = getStudent();
    // const profile = `/images/${student.photo}`
    const userId = student.idstudent;
    const { name, email, phone, address1, address2, address3, state, district, cgpa, backlog, ugyear, password } = req.body;
    const query = 'UPDATE student SET name = ?, email = ?, phone = ?, address1 = ?, address2 = ?, address3 = ?, state = ?, district = ?, cgpa = ?, backlog = ?, ugyear = ?, password = ? WHERE idstudent = ?';

    mysqlConnection.query(query, [name, email, phone, address1, address2, address3, state, district, cgpa, backlog, ugyear, password, userId], (err, results) => {
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
        mysqlConnection.query('SELECT * FROM student WHERE idstudent = ?', [userId], (err, results) => {
            if (err) {
                console.error('Error executing query: ', err);
                res.status(500).send('Internal Server Error');
                return;
            }
            setStudent(results[0])
            res.redirect('/student/dashboard')
        });

    });
});

// Define a function to fetch listed jobs from the database
const fetchJobs = (institute, appliedJobsArray) => {
    return new Promise((resolve, reject) => {
        // Prepare SQL statement to select jobs where approved is 1
        const sql = `SELECT * FROM jobs WHERE approved = 1 AND institute = ?`;
        // Execute the SQL statement
        mysqlConnection.query(sql, [institute], (err, results) => {
            if (err) {
                reject(err);
            } else {
                let filteredJobs = results
                if (appliedJobsArray && appliedJobsArray.length > 0) {
                    // Filter out jobs whose company is not in the appliedJobsArray
                    filteredJobs = results.filter(job => {
                        return !appliedJobsArray.includes(String(job.jobId));
                    });
                }
                resolve(filteredJobs);
            }
        });
    });
};

// Define a route to handle requests for fetching listed jobs
router.get('/student/applyJob', async (req, res) => {
    // setStudent(idstudent)
    student = getStudent()
    const profile = `/images/${student.photo}`
    try {
        institute = student.institute
        let appliedJobsArray = []
        if (student.appliedjobs) {
            appliedJobsArray = student.appliedjobs.split(',');
        }
        // Fetch listed jobs using async/await
        const jobs = await fetchJobs(institute, appliedJobsArray);

        // Render the HTML template with the fetched jobs data
        res.render('STD APPLY NEW JOB/std-apply-new-job', { student, jobs, profile })
    } catch (error) {
        console.error('Error fetching listed jobs:', error);
        res.status(500).send('Internal Server Error');
    }
});

const queryAsync = (sql, params) => {
    return new Promise((resolve, reject) => {
        mysqlConnection.query(sql, params, (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
}

router.post('/applyJobs', async (req, res) => {
    const jobId = req.body.jobId;
    const student = getStudent();
    const hardSkillsArray = JSON.parse(student.hardskills);

    // Fetch job details based on jobId
    const job = await queryAsync('SELECT * FROM jobs WHERE jobId = ? AND cgpa <= ? AND backlog >= ? AND skill IN (?)', [jobId, student.cgpa, student.backlog, hardSkillsArray]);

    let appliedJobs = student.appliedjobs || '';
    if (job.length > 0) {
        appliedJobs += (appliedJobs ? ',' : '') + job[0].jobId;
        student.appliedjobs = appliedJobs
        setStudent(student);
        await queryAsync('UPDATE student SET appliedJobs = ? WHERE idstudent = ?', [appliedJobs, student.idstudent]);
        res.status(200).send({
            "success": true,
        });
    } else {
        let appliedJobsArray = [];
        if (student.appliedjobs) {
            appliedJobsArray = student.appliedjobs.split(',');
        }
        res.status(200).send({
            "success": false,
            "error": "Does not meet the job requirements"
        });
    }
});



function getAppliedJobs(sql, params) {
    return new Promise((resolve, reject) => {
        mysqlConnection.query(sql, params, (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
}

router.get('/student/appliedjobs', async (req, res) => {
    student = getStudent();
    const profile = `/images/${student.photo}`;
    let appliedJobsArray = [];
    if (student.appliedjobs) {
        appliedJobsArray = student.appliedjobs.split(',')
    }
    let sql = `SELECT * FROM jobs WHERE approved = 1 AND institute = ?`;
    let params = [student.institute];

    // Check if appliedJobsArray is not empty
    if (appliedJobsArray.length > 0) {
        // Dynamically construct the IN clause
        sql += ` AND jobId IN (?)`;
        params.push(appliedJobsArray);
    } else {
        // If appliedJobsArray is empty, return an empty result set
        sql += ` AND 1=0`;
    }

    try {
        const jobs = await getAppliedJobs(sql, params);
        res.render('STD APPLIED JOBS/std-applied-jobs', { student, profile, jobs });
    } catch (error) {
        console.error('Error fetching applied jobs:', error);
        res.status(500).send('Error fetching applied jobs');
    }
});

// Express Route to Remove Job Application
router.post('/cancelJob', (req, res) => {
    let student = getStudent()
    const studentId = student.idstudent
    const jobIdToRemove = req.body.jobId
    // Fetch the current value of 'appliedjobs' column for the student
    mysqlConnection.query('SELECT appliedjobs FROM student WHERE idstudent = ?', [studentId], (error, results) => {
        if (error) {
            console.error('Error fetching applied jobs: ' + error);
            res.status(500).json({ error: 'Internal server error' });
            return;
        }

        if (results.length === 0) {
            res.status(404).json({ error: 'Student not found' });
            return;
        }

        const currentAppliedJobs = results[0].appliedjobs.split(',').map(jobId => jobId.trim());

        // Remove the specific job ID from the list
        const updatedAppliedJobs = currentAppliedJobs.filter(id => id !== jobIdToRemove).join(',');
        student.appliedjobs = updatedAppliedJobs
        setStudent(student)
        // Update the 'appliedjobs' column with the modified list
        mysqlConnection.query('UPDATE student SET appliedjobs = ? WHERE idstudent = ?', [updatedAppliedJobs, studentId], (updateError, updateResults) => {
            if (updateError) {
                console.error('Error updating applied jobs: ' + updateError);
                res.status(500).json({ error: 'Internal server error' });
                return;
            }
            res.send('Job cancelled successfully')
        });
    });
});


router.get('/student/resume', (req, res) => {
    const student = getStudent();
    const profile = `/images/${student.photo}`
    res.render("RESUME GENERATION/RESUME INTRODUCTION/resume_ntroduction", { student, profile })
})

router.get('/resume/form', (req, res) => {
    const student = getStudent()
    const profile = `/images/${student.photo}`
    res.render("RESUME GENERATION/RESUME FORM/resume_form", { student, profile })
})

router.post('/resume/form', (req, res) => {
    const details = req.body
    // const {project1, despro1, project2, despro2, project3, despro3, project4, despro4, Achievements, sslcinstitute, sslcyear, sslcper, hseinstitute, hseyear, hseper, hobbies, linkedin, portfolio} = req.body
    const student = getStudent()
    const profile = `/images/${student.photo}`
    const softskillsArray = JSON.parse(student.softskills);
    const hardskillsArray = JSON.parse(student.hardskills);
    const skill1 = hardskillsArray[0]
    const skill2 = hardskillsArray[1]
    hobbies = details.hobbies
    res.render('RESUME GENERATION/RESUME DISPLAY/resume_show', { student, profile })
    router.get('/resume_template.html', (req, res) => {
        res.render('RESUME GENERATION/RESUME DISPLAY/resume_template', { student, profile, softskillsArray, hardskillsArray, hobbies: hobbies, details, skill1, skill2 })
    })
})

router.get('/student/mocktest', (req, res) => {
    flag = "test"
    res.render("camera")
})

// router.get('/student/mocktest',(req,res)=>{
//     res.render("std-test/std-test")
// })

router.get('/MockTest/:heading', (req, res) => {
    let student = getStudent()
    let profile = `/images/${student.photo}`
    // Extract the encoded text from the URL parameter
    const encodedText = req.params.heading;

    // Decode the URL encoding
    const heading = decodeURIComponent(encodedText);

    // Render the page dynamically based on the extracted text
    res.render(`STD TEST DETAILS/${heading}/${heading}`, { student, profile })
})

router.get('/test/:heading', (req, res) => {
    let student = getStudent()
    let profile = `/images/${student.photo}`
    // Extract the encoded text from the URL parameter
    const encodedText = req.params.heading;

    // Decode the URL encoding
    const heading = decodeURIComponent(encodedText);

    // Check if the student has already attended the test

    if (student.test_type.includes(heading)) {
        res.render('std-test/std-test', { profile, error: 'You have already attended the test.' })
        return
    }

    res.render(`TESTS/${heading}/${heading}`, { student, profile })
})

router.post('/submit-score', async (req, res) => {
    let student = getStudent();
    let { score, type } = req.body;

    // Update the student's mock test score
    let currentScore = parseInt(score, 10)
    //Convert the score to the base of 100
    let mockTestScore = Math.round((((currentScore / 10) * 100) + student.mocktest_score) / 2)

    let totalScore = await Math.round((mockTestScore + student.fluency_score) / 2)

    // Retrieve the existing test types for the student
    let existingTestTypes = student.test_type || '';

    // Append the new test type to the existing ones
    let updatedTestTypes = existingTestTypes ? `${existingTestTypes},${type}` : type;
    student.mocktest_score = mockTestScore
    student.test_type = updatedTestTypes
    student.total = totalScore

    setStudent(student)
    // Update the student's record in the database with the new score and test type
    let sql = 'UPDATE student SET mocktest_score = ?, test_type = ?, total = ? WHERE idstudent = ?';
    mysqlConnection.query(sql, [mockTestScore, updatedTestTypes, totalScore, student.idstudent], (error, results) => {
        if (error) {
            console.error('Error updating mock test score:', error);
            res.status(500).send('Error updating mock test score');
            return;
        }
        res.json('Score and test type updated');
    });
});

router.get('/student/mockinterview', (req, res) => {
    flag = "interview"
    res.render("camera")
})

// router.get('/student/mockinterview',(req,res)=>{
//     res.render('MOCK INTERVIEW/interview')
// })

const saveImage = async (imageData) => {
    try {
        // Decode base64 to binary
        const base64Data = imageData.replace(/^data:image\/jpeg;base64,/, '');
        const binaryData = Buffer.from(base64Data, 'base64');

        // Generate a unique filename
        const filename = `captured-image-${Date.now()}.jpg`;

        // Save the binary data to a file
        await new Promise((resolve, reject) => {
            fs.writeFile(path.join('CHireMain/images', filename), binaryData, (err) => {
                if (err) {
                    console.error('Error saving image:', err);
                    reject(err);
                } else {
                    console.log('Image saved successfully:', filename);
                    resolve(filename); // Resolve with the filename
                }
            });
        });

        return filename; // Return the filename
    } catch (error) {
        throw error;
    }
};

const callFaceRecognition = async (user_profile_image_path, captured_image_path) => {
    try {
        const response = await axios.post('http://localhost:5000/perform-face-recognition', {
            user_profile_image_path: user_profile_image_path,
            captured_image_path: captured_image_path
        });
        return response.data.match; // Return the match result
    } catch (error) {
        throw error;
    }
};

const deleteCapturedImage = async (captured_image_path) => {
    try {
        await new Promise((resolve, reject) => {
            fs.unlink(path.join(captured_image_path), (err) => {
                if (err) {
                    console.error('Error deleting captured image:', err);
                    reject(err);
                } else {
                    console.log('Captured image deleted successfully');
                    resolve();
                }
            });
        });
    } catch (error) {
        throw error;
    }
};

router.post('/save-image', async (req, res) => {
    try {
        const student = getStudent();
        const { imageData } = req.body;

        const filename = await saveImage(imageData);

        const user_profile_image_path = `CHireMain/images/${student.photo}`
        console.log(user_profile_image_path)

        //const user_profile_image_path = 'CHireMain/images/SAVE_20230728_213842.jpg'; // Path to user profile image

        const match = await callFaceRecognition(user_profile_image_path, `CHireMain/images/${filename}`);
        console.log(match)

        if (match) {
            if (flag === "test") {
                flag = null
                //const student = getStudent();
                const profile = `/images/${student.photo}`
                res.render("std-test/std-test", { profile: profile });
            } else {
                flag = null
                //const student = getStudent();
                const profile = `/images/${student.photo}`
                res.render('MOCK INTERVIEW/interview', { profile })
            }
        } else {
            res.render("camera", { error: "Mismatch in the image" })
        }

        await deleteCapturedImage(`CHireMain/images/${filename}`);
    } catch (error) {
        console.error('Error performing face recognition:', error);
        res.render("camera", { error: "No face detected" })
    }
}
);

module.exports = router