const path = require('path');
const express = require('express')
const methodOverride = require('method-override')
const mongoose = require('mongoose')
const app = express()
const ErrorHandler = require('./ErrorHandler')
const session = require('express-session');
const flash = require('connect-flash');

/* Models */
const Product = require('./models/product')
const Garment = require('./models/garment')

// connect to mongodb
mongoose.connect('mongodb://127.0.0.1/shop_db')
    .then((result) => {
        console.log('connected to mongodb')
    }).catch((err) => {
        console.log(err)
    });

app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')
app.use(express.urlencoded({ extended: true }))
app.use(methodOverride('_method'))
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false
}))
app.use(flash())

app.use((req, res, next) => {
    res.locals.flash_message = req.flash('flash_message')
    next()
})


function wrapAsync(fn) {
    return function (req, res, next) {
        fn(req, res, next).catch(err => next(err))
    }
}

// /garments/:garment_id/product/create
app.get('/garments/:garment_id/product/create', (req, res) => {
    const {garment_id} = req.params
    res.render('products/create', {garment_id})
})
// /garments/:garment_id/product/
app.post('/garments/:garment_id/product', wrapAsync(async (req, res) => {
    const {garment_id} = req.params
    const product = new Product(req.body)
    const garment = await Garment.findById(garment_id)
    garment.products.push(product)
    await garment.save()
    product.garment = garment
    product.save()
    res.redirect(`/garments/${garment_id}`)
}))
// app.get('/garments/:garment_id/product/')
// /garments/:garment_id/product/:product_id/edit
// /garments/:garment_id/product/:product_id

app.get('/', (req, res) => {
    res.send('Halaman sederhana')
})

app.get('/garments', wrapAsync(async (req, res) => {
    const garments = await Garment.find({})
    res.render('garments/index', {garments})
}))
app.get('/garments/create', (req, res) => {
    res.render('garments/create')
})
app.post('/garments', wrapAsync(async (req, res) => {
    const garments = new Garment(req.body)
    await garments.save()
    req.flash('flash_message', 'data berhasil ditambahkan! ya bro')
    res.redirect('/garments')
}))
app.get('/garments/:id', wrapAsync(async (req,res) => {
    const {id} = req.params
    const garments = await Garment.findById(id).populate('products')
    res.render('garments/show', {garments})
}))
app.delete('/garments/:id', wrapAsync(async (req, res) => {
    const {id} = req.params
    await Garment.findOneAndDelete({_id: id})
    res.redirect('/garments')
}))

app.get('/products', async (req, res) => {
    const { category } = req.query
    if (category) {
        const products = await Product.find({ category })
        res.render('products/index', { products, category })
    } else {
        const products = await Product.find({})
        res.render('products/index', { products, category: 'All' })
    }
})

app.get('/products/create', (req, res) => {
    res.render('products/create')
})

app.post('/products', wrapAsync(async (req, res) => {
    const product = new Product(req.body)
    await product.save()
    res.redirect(`/products/${product._id}`)
}))

app.get('/products/:id', wrapAsync(async (req, res) => {
    const { id } = req.params
    const product = await Product.findById(id).populate('garment')
    res.render('products/show', { product })
}))

app.get('/products/:id/edit', wrapAsync(async (req, res) => {
    const { id } = req.params
    const product = await Product.findById(id)
    res.render('products/edit', { product })
}))

app.put('/products/:id', wrapAsync(async (req, res) => {
    const { id } = req.params
    const product = await Product.findByIdAndUpdate(id, req.body, { runValidators: true })
    res.redirect(`/products/${product._id}`)
}))

app.delete('/products/:id', wrapAsync(async (req, res) => {
    const { id } = req.params
    await Product.findByIdAndDelete(id)
    res.redirect('/products')
}))

const validatorHandler = err => {
    err.status = 400
    err.message = Object.values(err.errors).map(item => item.message)
    return new ErrorHandler(err.message, err.status)
}

app.use((err, req, res, next) => {
    console.dir(err)
    if (err.name === 'ValidationError') err = validatorHandler(err)
    if (err.name === 'CastError') {
        err.status = 404
        err.message = 'Product not found'
    }
    next(err)
})

app.use((err, req, res, next) => {
    const { status = 500, message = 'Something went wrong' } = err
    res.status(status).send(message);
})


app.listen(3000, () => {
    console.log('shop app listening on http://127.0.0.1:3000')
})