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


// router.get('/student/dashboard',(req,res)=>{
//     const student = getStudent();
//     //Parse JSON strings into JavaScript objects
//     const softskillsArray = JSON.parse(student.softskills);
//     const hardskillsArray = JSON.parse(student.hardskills);
//     const profile = `/images/${student.photo}`
//     res.render('std-dashboard/std-dashboard', {userName:student.name,cgpa:student.cgpa,test:student.mocktest_score,fluency:student.fluency_score,internships:student.internships,phn:student.phone,mail:student.email,address1:student.address1,address2:student.address2,address3:student.address3,total:student.total,hard:hardskillsArray,soft:softskillsArray,institute:student.institute,year:student.ugyear,profile:profile });
// })

router.get('/student/dashboard', async (req, res) => {
    try {
        const student = getStudent();
        const softskillsArray = JSON.parse(student.softskills);
        const hardskillsArray = JSON.parse(student.hardskills);
        const profile = `/images/${student.photo}`

        // Query to fetch matching jobs
        const sql = `SELECT * FROM jobs WHERE institute = ? AND skill IN (?) AND cgpa < ? AND backlog > ?`;

        // Execute the query
        const jobs = await executeQuery(sql, [student.institute, hardskillsArray, student.cgpa, student.backlog]);

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

router.get('/student/cv', (req, res) => {
    const student = getStudent();
    const profile = `/images/${student.photo}`
    res.render("cv-gen/cv-gen", { profile: profile })
})

router.get('/cv-template', (req, res) => {
    res.render("cv-gen/cv-template")
})

router.get('/student/mocktest', (req, res) => {
    flag = "test"
    res.render("camera")
})

router.get('/student/mockinterview', (req, res) => {
    flag = "interview"
    res.render("camera")
})

router.get('/fluency.html', (req, res) => {
    const student = getStudent();
    const profile = `/images/${student.photo}`
    res.render('MOCK INTERVIEW/fluency', { profile: profile })
})

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
                res.render("std-test/std-test.ejs", { profile: profile });
            } else {
                flag = null
                //const student = getStudent();
                const profile = `/images/${student.photo}`
                res.render('MOCK INTERVIEW/interview', { profile: profile })
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