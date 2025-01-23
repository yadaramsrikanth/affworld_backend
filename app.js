const express=require("express")
const app=express()
const sqlite3=require("sqlite3")
const {open}=require("sqlite")
const path=require("path")

const dbPath=path.join(__dirname,"data.db")
let db=null
let PORT=3005
const bcrypt=require("bcrypt")
const jwt=require("jsonwebtoken")
const cors=require("cors")
const dotenv=require("dotenv")
dotenv.config()
const multer=require("multer")
const cloudinary=require("cloudinary").v2

app.use(express.json())
app.use(cors({origin:"*",
    methods: ["GET", "POST", "PUT", "DELETE"], 
    allowedHeaders: ["Content-Type", "Authorization"], 
}))
const InitializaeDBAndServer=async()=>{
    try{
        db=await open({
            filename:dbPath,
            driver:sqlite3.Database
        })
        app.listen(PORT,()=>{
            console.log(`server Running successfully ${PORT}`)
        })
    }catch(e){
        console.log(`DB Error: ${e.message}`)
        process.exit(1)
    }
    
}
InitializaeDBAndServer()

//USER REGISTRATION

app.post('/register',async(request,response)=>{
const {name,email,password}=request.body
const hashedPassword= await bcrypt.hash(password,10)
const selectUserquery=`select * from user where name='${name}'`;
const dbUser=await db.get(selectUserquery)
if (dbUser===undefined){
    const createUserQuery=`INSERT INTO USER (name,email,password)
    values
    ('${name}','${email}','${hashedPassword}');
    `;
    await db.run(createUserQuery)
    response.send({user:"User Created Successfully"})
}else{
    response.status(400)
    response.send({user:"User Already Exists"})
}

})

//USER LOGIN
app.post('/login',async (request,response)=>{
    const {email,password}=request.body
    const selectUserquery=`select * from user where email='${email}';`;
    const dbUser=await db.get(selectUserquery);
    
    if (dbUser===undefined){
        response.status(400)
        response.send({User:"Invalid User"})
    }else{
        const isPasswordMatched=await bcrypt.compare(password,dbUser.password)
        
        if (isPasswordMatched){
            const payload={email:email}
            const jwttoken=jwt.sign(payload,"SECRET_TOKEN")
            response.send({jwttoken})
        }else{
            response.status(400)
            response.send({User:"Invalid Password"})
        }
    }
})

//Forgot Password Route

app.post('/forgotpassword',async(request,response)=>{
    const {email,password}=request.body
    const userDetails=`select * from user where email='${email}';`;
    
    const dbUser=await db.get(userDetails)
    console.log(dbUser)
    if(dbUser===undefined){
        response.status(400)
        response.send({user:"No user found with this email"})
    }else{
        const hashedPassword=await bcrypt.hash(password,10)
        const updateUserpassword=`UPDATE user SET password='${hashedPassword}'
        where
        email='${email}';`
        await db.run(updateUserpassword)
        response.send({user:"Password has been reset successfully"})
    }
})

//Tasks Creation
app.post('/tasks',async(request,response)=>{
    const {name,description}=request.body
    const InsertTaskQuery=`Insert Into tasks (name,description,status)
    values
    ('${name}','${description}','Pending');`
    await db.run(InsertTaskQuery)
    response.send("task created successfully")
})

//Getting tasks
app.get('/tasks',async(request,response)=>{
    const tasksquery=`select * from tasks`
    const tasksarray=await db.all(tasksquery)
    response.send({tasks:tasksarray})
})
//Updating Task
app.put('/tasks/:id',async(request,response)=>{
    const {id}=request.params
    const {status}=request.body
    const updatetaskstatus=`update tasks set status='${status}' where id=${id};`
    await db.run(updatetaskstatus)
    response.send({status:"Task Status Updated Successfully"})
})


//Task Deletion
app.delete("/tasks/:id",async(request,response)=>{
    const {id}=request.params
    const deletetask=`delete from tasks where id=${id};`;
    await db.run(deletetask)
    response.send({status:"Task Deleted Successfully"})
})



//Retrieving posts
app.get('/posts',async(request,response)=>{
    const postsselectquery=`select * from posts`
    const postsarray=await db.all(postsselectquery)
    response.send({posts:postsarray})
})
//Posts Creation Cloudinary
cloudinary.config({
    cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
    api_key:process.env.CLOUDINARY_CLOUD_API,
    api_secret:process.env.CLOUDINARY_CLOUD_SECRET
})

const storage=multer.diskStorage({})
const upload=multer({storage})
app.post("/posts",upload.single('file'),async(request,response)=>{
    try{
        const {caption}=request.body
        const result=await cloudinary.uploader.upload(request.file.path,{
            folder:"posts"
        })
        const imageurl=result.secure_url
        const postcreatequery=`insert into posts(photo_url,caption)
        values
        ('${imageurl}','${caption}');`
        await db.run(postcreatequery)
        response.send({post:"New post created successfully"})
    }catch(e){
        console.log(`error, ${e}`)
    }
    
})