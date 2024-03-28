const mysql = require('mysql');

// Create a MySQL connection pool
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'Akshay@123',
    database: 'cleverhire'
});

// Function to delete expired jobs
function deleteExpiredJobs() {
    console.log('function called for deleting the jobs')
    // Get current timestamp
    const currentTimestamp = new Date();

    // Query to delete expired jobs
    const deleteQuery = "DELETE FROM jobs WHERE deadline < ?";

    // Execute the query
    pool.query(deleteQuery, [currentTimestamp], (err, result) => {
        if (err) {
            console.error("Error deleting expired jobs:", err);
        } else {
            console.log("Expired jobs deleted successfully");
        }
    });
}

// Call the function to delete expired jobs
deleteExpiredJobs();
