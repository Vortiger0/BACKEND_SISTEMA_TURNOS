import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client";


const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
// prisma necesita un adaptador para conectarse a la base de datos, en este caso se está utilizando el adaptador de mariadb proporcionado por prisma.
const prisma = new PrismaClient ({adapter});

async function main(){
    const sucursalesData = [
        {
            nombre: "RedPagos Centro",
            organismo: "RedPagos",
            direccion: "Aparicio Saravia 658",
            latitud: -32.3671,
            longitud: -54.1745,
            telefono: "4642-8276",
            margenCorte: 15,
            umbralPocoOcupado: 5,
            umbralOcupado:15,
            cantidadCajas: 3,
        },
        {
            nombre: "Farmacia Hospital",
            organismo: "ASSE",
            direccion: "Treinta y Tres 226",
            latitud: -32.3671,
            longitud: -54.1745,
            telefono: "4642-5678",
            margenCorte: 15,
            umbralPocoOcupado: 5,
            umbralOcupado:15,
            cantidadCajas: 3,
        },
        {
            nombre: "Abitab centro",
            organismo: "ABITAB",
            direccion: "Aparicio Saravia 598",
            latitud: -32.3671,
            longitud: -54.1745,
            telefono: "4642-8133",
            margenCorte: 15,
            umbralPocoOcupado: 5,
            umbralOcupado:15,
            cantidadCajas: 3,
        },
        {
            nombre: "Abitab TATA",
            organismo: "ABITAB",
            direccion: "C.Villanueva Saravia Pinto",
            latitud: -32.3671,
            longitud: -54.1745,
            telefono: "1111-1111",
            margenCorte: 15,
            umbralPocoOcupado: 5,
            umbralOcupado:15,
            cantidadCajas: 3,
        },
        {   
            nombre: "Abitab DORADO",
            organismo: "ABITAB",
            direccion: "Remigio Castellanos 1106",
            latitud: -32.3671,
            longitud: -54.1745,
            telefono: "1111-1111",
            margenCorte: 15,
            umbralPocoOcupado: 5,
            umbralOcupado:15,
            cantidadCajas: 3,
            
        },
        {
            nombre: "Sucursal de Testing",
            organismo: "TESTING",
            direccion: "N/A",
            latitud: 0,
            longitud: 0,
            telefono: "0000-0000",
            margenCorte: 15,
            umbralPocoOcupado: 5,
            umbralOcupado: 15,
            cantidadCajas: 1,
        }
        ];
    const dias = [
        "LUNES",
        "MARTES",
        "MIERCOLES",
        "JUEVES",
        "VIERNES",
        "SABADO",
        "DOMINGO"
    ] as const;

    const sucursalesCreadas = [];

    for (const datos of sucursalesData) {
        const sucursal = await prisma.sucursal.create({ data: datos});
        sucursalesCreadas.push(sucursal);


    for (const dia of dias) {
        await prisma.horario.create({
            data: {
                diaSemana: dia,
                atiende: true,
                horaDesde: new Date("1970-01-01T09:00:00"),
                horaHasta: new Date("1970-01-01T18:00:00"),
                sucursalId: sucursal.id,
            },
        });
    }
}
//admins de prueba 
//primero crea los admins con sus datos y por cada uno chequea que la sucursal asociada exista
//
const adminsData = [
    {
        nombreCompleto: "Hernando Lopez",
        nombreUsuario: process.env.ADMIN_REDPAGOS_USERNAME!,
        contrasena: process.env.ADMIN_REDPAGOS_PASSWORD!,
        sucursal: sucursalesCreadas[0],
    },
    {
        nombreCompleto: "Maria Perez",
        nombreUsuario: process.env.ADMIN_FARMACIA_USERNAME!,
        contrasena: process.env.ADMIN_FARMACIA_PASSWORD!,
        sucursal: sucursalesCreadas[1],
    },
    {
        nombreCompleto: "Leo Fernandez",
        nombreUsuario: process.env.ADMIN_ABITABCENTRO_USERNAME!,
        contrasena: process.env.ADMIN_ABITABCENTRO_PASSWORD!,
        sucursal: sucursalesCreadas[2],
    },
    {
        nombreCompleto: "Andrea Guiterrez",
        nombreUsuario: process.env.ADMIN_ABITABTATA_USERNAME!,
        contrasena: process.env.ADMIN_ABITABTATA_PASSWORD!,
        sucursal: sucursalesCreadas[3],
    },
    {
        nombreCompleto: "Marcos Rodriguez",
        nombreUsuario: process.env.ADMIN_ABITABDORADO_USERNAME!,
        contrasena: process.env.ADMIN_ABITABDORADO_PASSWORD!,
        sucursal: sucursalesCreadas[4],
    },
    {
        nombreCompleto: "Admin de Testing",
        nombreUsuario: process.env.ADMIN_TESTING_USERNAME!,
        contrasena: process.env.ADMIN_TESTING_PASSWORD!,
        sucursal: sucursalesCreadas[5],
    }

];

for (const datos of adminsData) {
    if(!datos.sucursal) {
        throw new Error(`Sucursal no encontrada para el admin ${datos.nombreUsuario}`);
    }

    const contraHash = await bcrypt.hash(datos.contrasena, 10);

    //crea el usuario base 
    const usuario = await prisma.usuario.create({
        data: {
            nombreCompleto: datos.nombreCompleto,
            contrasena: contraHash,
            rol: "ADMIN",
        }
    })
    //crea la fila de admin usando el mismo id del usuario creado anteriormente y la sucursal asociada
    await prisma.admin.create({
        data: {
            id: usuario.id,
            nombreUsuario: datos.nombreUsuario,
            sucursalId: datos.sucursal.id,
        }
    })

 }

 //funcionario de prueba
 const funcionariosData = [
    {
        nombreCompleto: "Juan Gonzalez",
        nombreUsuario: process.env.FUNCIONARIO_REDPAGOS_USERNAME!,
        contrasena: process.env.FUNCIONARIO_REDPAGOS_PASSWORD!,
        numeroCaja: 1,
        sucursal: sucursalesCreadas[0],
    }
];

for (const datos of funcionariosData) {
    if(!datos.sucursal) {
        throw new Error(`Sucursal no encontrada para el funcionario ${datos.nombreUsuario}`);
    }

    const contraHash = await bcrypt.hash(datos.contrasena, 10);

    const usuario = await prisma.usuario.create({
        data: {
            nombreCompleto: datos.nombreCompleto,
            contrasena: contraHash,
            rol: "FUNCIONARIO",
        },
    });

    await prisma.funcionario.create({
        data:{
            id: usuario.id,
            nombreUsuario: datos.nombreUsuario,
            numeroCaja: datos.numeroCaja,
            sucursalId: datos.sucursal.id,
        },
    });



 }
 }

// ejecuta la función main y maneja cualquier error que pueda ocurrir durante su ejecución. Si ocurre un error, se imprime en la consola y se termina el proceso con un código de salida 1. Finalmente, se desconecta de la base de datos para liberar recursos.
main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });