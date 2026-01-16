import { supabase } from "../config/db.js";

export const registrarUsuario = async (req, res) => {
  const { nombre, apellido, contrasenia,email } = req.body;

  const { data, error } = await supabase
    .from("Vendedor")
    .insert([{ nombre, apellido, contrasenia,email }])
    .select();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.status(201).json({
    message: "Usuario registrado con éxito",
    user: data[0],
  });
};

export const getUsers = async (req, res) => {
    
    try {
    
        console.log(req.params)
        const { id } = req.params;

        // Si id es undefined o no es un número, devolvemos error antes de ir a Supabase
        if (!id || id === 'undefined' || isNaN(id)) {
            return res.status(400).json({ 
                error: "El ID proporcionado no es un número válido",
                recibido: id 
            });
        }

        const { data, error } = await supabase
            .from('Vendedor')
            .select('*')
            .eq('id', parseInt(id)) // Forzamos a que sea un entero
            .maybeSingle();

        if (error) return res.status(400).json({ error: error.message });
        if (!data) return res.status(404).json({ message: "No existe el vendedor" });

        return res.status(200).json(data);

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};



