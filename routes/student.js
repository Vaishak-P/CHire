const mysql = require('mysql');
const expres = require('express')
const router = expres.Router()
const fs = require('fs');
const path = require('path');
const axios = require('axios'); // Import Axios for making HTTP requests

let user = require('D:/mainProject/CHire/server')
console.log(user)

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

router.get('/REGISTER/student',(req,res)=>{
    res.render('REGISTER/stud-reg-form/stud-reg-form')
})

router.post('/register/student',(req,res)=>{
    console.log(req.body)
})

// Assuming you have a route to handle the AJAX request
router.get('/institutes', (req, res) => {
    console.log('api endpoint invoked successfully')
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
            console.log(results)
            // Send the list of institute names as a response
            res.json({ institutes: results });
            
        }
    );
});




// router.post('/register/student', (req, res) => {
//     const { name, phone, email, softskills, password, photo } = req.body;
//     const softskillsString = JSON.stringify(softskills);

//     mysqlConnection.query(
//         'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
//         [email, password, 'student'],
//         (err, results) => {
//             if (err) {
//                 console.error('Error executing query: ', err);
//                 res.status(500).send('Internal Server Error');
//                 return;
//             }
//         }
//     );

//     mysqlConnection.query(
//         'INSERT INTO student (photo, name, phone, email, password, softskills, addres, blood_group, cgpa, sem) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
//         [photo, name, phone, email, password, softskillsString, "hjaskd", "a+", 3.5, 7],
//         (err, results) => {
//             if (err) {
//                 console.error('Error executing query: ', err);
//                 res.status(500).send('Internal Server Error');
//                 return;
//             }

//             // Registration successful
//             res.redirect('/LOGIN');
//         }
//     );

// });


router.get('/student/dashboard',(req,res)=>{
    res.render('std-dashboard/std-dashboard', {userName:user.name,cgpa:user.cgpa,sem:user.sem,test:user.mocktest_score,fluency:user.fluency_score,internships:user.internships,phn:user.phone,mail:user.email,addres:user.addres,bld:user.blood_group,total:user.total })
})

router.get('/student/cv',(req,res)=>{
    res.render("cv-gen/cv-gen")
    console.log(user)
})

router.get('/cv-template',(req,res)=>{
    res.render("cv-gen/cv-template")
})

router.get('/student/mocktest',(req,res)=>{
    res.render("camera")
    // res.render("std-test/std-test")
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
        console.log("dfdfg")
        console.log('Face recognition response:', response.data);
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
        const { imageData } = req.body;

        const filename = await saveImage(imageData);

        const user_profile_image_path = 'CHireMain/images/SAVE_20230728_213842.jpg'; // Path to user profile image

        const match = await callFaceRecognition(user_profile_image_path, `CHireMain/images/${filename}`);
        console.log(match)

        if (match) {
            console.log("Rendering test page");
            // res.render("std-test/std-test");
            res.render("std-test/std-test.ejs", );
        } else {
            console.log("Rendering error page");
            renderPage("camera", res, { error: "Mismatch in the image" }); // Render camera page with error message
        }

        await deleteCapturedImage(`CHireMain/images/${filename}`);
    } catch (error) {
        console.error('Error performing face recognition:', error);
        renderPage("camera", res, { error: "No face detected" });
    }
}
);

function renderPage(page, res, data) {
    res.render(page, data, (err, html) => {
        if (err) {
            console.error('Error rendering page:', err);
            res.status(500).send('Internal Server Error');
        } else {
            res.send(html);
        }
    });
}



module.exports = router