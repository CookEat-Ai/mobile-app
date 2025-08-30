const fs = require('fs');
const path = require('path');

// Path to the gradle.properties file
const gradlePropertiesPath = path.join(__dirname, '..', 'android', 'gradle.properties');

// Check if the gradle.properties file exists and add the Jetifier setting if needed
if (fs.existsSync(gradlePropertiesPath)) {
  const gradleContent = fs.readFileSync(gradlePropertiesPath, 'utf8');
  if (!gradleContent.includes('android.enableJetifier=true')) {
    fs.appendFileSync(gradlePropertiesPath, '\nandroid.enableJetifier=true\n', 'utf8');
    console.log('android.enableJetifier=true added to gradle.properties');
  } else {
    console.log('android.enableJetifier=true already exists in gradle.properties');
  }
} else {
  console.log('gradle.properties not found. Skipping Jetifier configuration.');
}