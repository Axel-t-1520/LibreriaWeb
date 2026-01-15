import { supabase } from "../config/db.js";


export const registerProduct = async(req,res)=>{
    const {id, nombre,descripcion, precio_unitario, stock,precio_venta} = req.body 
    const {data,error} = await supabase
    .from('Producto')
    .insert([{id,nombre,descripcion,precio_unitario,stock,precio_venta}])
    .select()

    if(error){
        return res.status().json({
            message: "no se registro el producto"
        })
    }
    res.status(200).json({
        message:'se registro el producto'
    })

}