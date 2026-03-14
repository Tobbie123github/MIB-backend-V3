const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const passport = require("passport");
const router = express.Router();
require("../auth/googleJwt");

router.post("/register", async (req, res) => {
  const { email} = req.body;

  try {
    if (!email ) {
      return res.status(400).json({ message: "All fields are required" });
    }      
        
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists, please use a diffrent one" });
    }    
             
        
 const user = await new User({ email }).save();

        
 const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });


res.status(201).json({ message: "Registration Successful", success: true, user, token });
      
        
    }catch (error){
    console.error("Error in signup controller", error);
    res.status(500).json({ message: "Internal Server Error" });
    }  
    
});

router.delete("/delete", async (req, res) => {
  const { email } = req.body;
  try {
    await User.deleteOne({ email });
    res.status(200).json({ success: true, message: "User deleted" });
  } catch (error) {
    console.error("Error deleting user", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


router.post("/login", async (req, res) => {
  const { email} = req.body;
    
    try{
        
     if (!email) {
      return res.status(400).json({ message: "All fields are required" });
    }   
        
      const user = await User.findOne({ email });
  if (!user)
    return res.status(401).json({ message: "Invalid credentials" });   
        
 const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });     
        

    res.status(200).json({ success: true, user, token });   
        
    }catch (error){
        console.log("Error in login controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
    }
});


//  router.post("/logout", (req, res)=>{
//      res.clearCookie("jwt");
//  res.status(200).json({ success: true, message: "Logout successful" });
//  });  
router.get('/verify-token', (req, res) => {
    const token = req.headers['authorization']?.split(' ')[1]; 

    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: 'Please Login' });
        }

       
        res.status(200).json({ message: 'Token is valid', userId: decoded.id });
    });
}); 
 

router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));


router.get("/google/callback", passport.authenticate("google", { session: false }), async (req, res) => {
  const user = req.user;

  
  const token = jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

 
  res.redirect(`https://myinsurebank.com/user-dashboard?token=${token}`);
});



module.exports = router;
