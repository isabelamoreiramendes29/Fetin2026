// ============================================================
// CEMTINEL — peças para impressão 3D
// Maquete do balão da betoneira para a demonstração da Fetin 2026
//
// COMO USAR
//   1. Instale o OpenSCAD (gratuito): https://openscad.org
//   2. Abra este arquivo
//   3. Troque a variável `parte` abaixo para escolher o que renderizar
//   4. F5 para pré-visualizar, F6 para renderizar de verdade
//   5. F7 exporta o STL para o fatiador
//
// ORDEM DE IMPRESSÃO RECOMENDADA
//   1o. "flange_umidade"   — ~20 min. Serve de teste de encaixe.
//   2o. "flange_temp"      — ~15 min
//   3o. "caixa"            — ~1 h. Uma só, para a protoplaca inteira.
//   4o. "tambor"           — 6 a 8 h, só depois que o resto estiver certo
//   5o. "berco"            — IMPRIMA DOIS, um para cada apoio
//
//   SÓ DEPOIS QUE TUDO ACIMA ESTIVER FUNCIONANDO:
//   6o. "chassi"           — 4 a 6 h. Eleva o tambor (a água precisa disso).
//   7o. "cabine"           — 4 a 6 h. Abriga o ESP do GPS, antena para cima.
//   8o. "roda"             — ~30 min cada. Imprima 6, ou 4 se o tempo apertar.
//
//   "teste_furos" é opcional: testa três folgas de uma vez, em 10 min.
//   Vale se voce nao conhece o comportamento da sua impressora.
//
//   "calha" ficou fora da montagem — a mangueira vai direto do sensor de
//   vazao para o balde. A peca continua aqui caso voce mude de ideia.
// ============================================================


// ============================================================
// O QUE RENDERIZAR
// "teste_furos" | "flange_umidade" | "flange_temp" | "caixa"
// "calha" | "tambor" | "berco_frente" | "berco_tras" | "paralama"
// "chassi" | "roda" | "cabine" | "retrovisor" | "tudo"
// ============================================================
parte = "tudo";


// ============================================================
// MEDIDAS DOS SEUS SENSORES — MEÇA COM PAQUÍMETRO E TROQUE AQUI
//
// A sonda de umidade capacitiva costuma ser uma placa CHATA.
// Meça a largura e a espessura dela.
// O sensor de temperatura à prova d'água costuma ser um tubinho REDONDO.
// ============================================================
sonda_um_larg  = 12;    // largura da sonda de umidade (mm)
sonda_um_esp   = 4;     // espessura da sonda de umidade (mm)
sensor_temp_d  = 6.5;   // diâmetro do sensor de temperatura (mm)

// Folga de impressão. Furo impresso sempre sai menor que o desenho.
// Se ficar apertado, aumente para 0.7. Se ficar bambo, baixe para 0.3.
folga = 0.5;


// ============================================================
// MEDIDAS DO TAMBOR
// ============================================================
tambor_comp   = 150;   // comprimento total
tambor_r_max  = 45;    // raio na barriga
tambor_r_boca = 24;    // raio na boca aberta
parede        = 2.4;   // espessura da parede (3 perímetros num bico 0.4)

cintas = true;         // as duas cintas de reforço, só enfeite

// Alturas onde cada coisa fica, medidas do fundo fechado.
// TODAS FICAM DO MESMO LADO (+X), que é o lado que fica PARA CIMA quando o
// tambor deita no berço. Não existe mais nenhum furo embaixo.
z_umidade   = 55;      // sonda de umidade
z_temp      = 92;      // sensor de temperatura
z_passagem  = 122;     // rasgo por onde sobem a mangueira e o fio da bomba

// Tamanho do rasgo da passagem. Precisa caber mangueira E fio juntos —
// um rasgo largo é muito mais fácil de enfiar que dois furos justos.
passagem_comp = 30;
passagem_larg = 16;


// ============================================================
// PERFIL DO TAMBOR
// Pares [raio, altura]. O OpenSCAD gira isso em volta do eixo.
// Mexer aqui muda o formato — o desenho é o da betoneira:
// fundo fechado embaixo, barriga no meio, boca aberta em cima.
// ============================================================
perfil_externo = [
    [0,               0],
    [32,              0],
    [42,             25],
    [tambor_r_max,   60],
    [43,             95],
    [34,            125],
    [tambor_r_boca, tambor_comp],
    [0,             tambor_comp],
];

perfil_interno = [
    [0,                       parede],
    [32 - parede,             parede],
    [42 - parede,             25],
    [tambor_r_max - parede,   60],
    [43 - parede,             95],
    [34 - parede,            125],
    [tambor_r_boca - parede, tambor_comp + 5],
    [0,                      tambor_comp + 5],
];


// ============================================================
// PEÇA 1 — TESTE DE FUROS
// Imprima ISTO PRIMEIRO. São 10 minutos e evita descobrir que o
// furo ficou apertado depois de 8 horas imprimindo o tambor.
// Três furos de cada tipo, com folgas diferentes.
// ============================================================
module teste_furos() {
    difference() {
        cube([96, 34, parede + 2], center = false);

        for (i = [0 : 2]) {
            f = 0.3 + i * 0.2;   // 0.3, 0.5, 0.7

            // furo da sonda de umidade (retangular)
            translate([14 + i * 16, 10, -1])
                cube([sonda_um_esp + f, sonda_um_larg + f, parede + 4], center = true);

            // furo do sensor de temperatura (redondo)
            translate([14 + i * 16, 25, -1])
                cylinder(d = sensor_temp_d + f, h = parede + 4, $fn = 40);
        }
    }
}


// ============================================================
// PEÇA 2 — FLANGES DAS SONDAS
// Segura a sonda na altura certa e tapa o furo do tambor.
// A aba larga apoia na parede; o pescoço entra no furo.
//
// `redondo = true`  → sensor de temperatura
// `redondo = false` → sonda de umidade (furo retangular)
// ============================================================
module flange_umidade() {
    difference() {
        union() {
            cylinder(d = sonda_um_larg + 18, h = 4,  $fn = 60);
            cylinder(d = sonda_um_larg + 9,  h = 12, $fn = 60);
        }
        translate([0, 0, -1])
            linear_extrude(height = 16)
                square([sonda_um_esp + folga, sonda_um_larg + folga], center = true);
    }
}

module flange_temp() {
    difference() {
        union() {
            cylinder(d = sensor_temp_d + 18, h = 4,  $fn = 60);
            cylinder(d = sensor_temp_d + 9,  h = 12, $fn = 60);
        }
        translate([0, 0, -1])
            cylinder(d = sensor_temp_d + folga, h = 16, $fn = 48);
    }
}


// ============================================================
// PEÇA 3 — CALHA
// Meia-cana aberta em cima, com uma aba para prender a mangueira
// na cabeceira. Imprime deitada, sem suporte.
// ============================================================
calha_comp = 95;
calha_re   = 19;   // raio externo
calha_par  = 2.4;  // parede

module calha() {
    difference() {
        union() {
            // meia-cana
            rotate([0, 90, 0])
                difference() {
                    cylinder(h = calha_comp, r = calha_re, $fn = 72);
                    translate([0, 0, -1])
                        cylinder(h = calha_comp + 2, r = calha_re - calha_par, $fn = 72);
                }
            // aba da cabeceira, para amarrar a mangueira
            translate([0, -calha_re, -calha_re])
                cube([8, calha_re * 2, calha_re]);
        }

        // corta tudo acima do eixo: é isso que abre a calha em cima
        translate([-2, -calha_re - 2, 0])
            cube([calha_comp + 12, calha_re * 2 + 4, calha_re + 4]);

        // furo da abraçadeira na aba
        translate([4, 0, -calha_re + 8])
            rotate([0, 90, 0])
                cylinder(d = 5, h = 20, center = true, $fn = 30);
    }
}


// ============================================================
// PEÇA — CAIXA DO ESP32
// Bandeja aberta em cima que segura a placa. Duas abas com fenda
// nas pontas: passa uma abraçadeira por elas, dá a volta no tambor
// e aperta. Assim ela prende em superfície curva sem precisar de
// furo nenhum no tambor — e dá para reposicionar quando quiser.
//
// Fica em CIMA do tambor de propósito: no caminhão real a eletrônica
// anda junto com o balão e publica por rádio, porque fio saindo de
// coisa que gira torce e arrebenta. É o argumento do MQTT, visível.
//
// MEÇA A SUA PLACA. Uma ESP32 DevKit V1 tem por volta de 52 x 28 mm,
// mas tem variação grande entre modelos.
// ============================================================
// ── A PROTOPLACA ──
// UMA caixa só, para a protoplaca inteira: sensores e GPS juntos.
//
// MEÇA A SUA E TROQUE ESTES TRÊS NÚMEROS.
// Referência: as PCBs antigas eram 111 x 67 e 79 x 70 mm; na protoplaca
// única o tamanho fica por aí somado. Protoplacas comuns: 90x150, 80x120.
placa_comp = 150;
placa_larg = 90;

// ATENÇÃO À ALTURA. Numa protoplaca o que ocupa espaço não é a placa, são os
// JUMPERS ESPETADOS EM PÉ — um jumper macho sobe uns 10 mm sozinho, e o
// módulo espetado em cima dele sobe mais.
//
// Meça com tudo montado, do fundo da placa ao ponto mais alto.
placa_alt = 30;

// Folga das PLACAS, por lado. Menor que a folga dos furos de sensor de
// propósito: placa bamba chacoalha e solta fio, e sobra você não tira.
// Se entrar forçando, suba para 0.6. Se sobrar, baixe para 0.3.
folga_placa = 0.4;

// Bandeja genérica: as duas caixas saem daqui, só mudam as medidas
module caixa(l_placa, w_placa, h_placa) {
    par  = 2.4;              // parede
    base = 2.0;              // fundo
    l = l_placa + folga_placa * 2;
    w = w_placa + folga_placa * 2;

    difference() {
        union() {
            // corpo da bandeja
            translate([-(l / 2 + par), -(w / 2 + par), 0])
                cube([l + par * 2, w + par * 2, h_placa + base]);

            // abas laterais para a abraçadeira
            translate([-(l / 2 + par) - 12, -(w / 2 + par), 0])
                cube([12, w + par * 2, 4]);
            translate([(l / 2 + par), -(w / 2 + par), 0])
                cube([12, w + par * 2, 4]);
        }

        // cavidade onde a placa deita
        translate([-l / 2, -w / 2, base])
            cube([l, w, h_placa + 2]);

        // recorte do conector USB numa ponta
        translate([-(l / 2 + par + 1), -6, base + 1])
            cube([par + 2, 12, 9]);

        // passagem dos cabos na outra ponta
        translate([l / 2, -8, base + 2])
            cube([par + 2, 16, 12]);

        // fendas das abraçadeiras
        translate([-(l / 2 + par) - 8, -(w / 2 + par) - 1, -1])
            cube([4, w + par * 2 + 2, 6]);
        translate([(l / 2 + par) + 4, -(w / 2 + par) - 1, -1])
            cube([4, w + par * 2 + 2, 6]);
    }
}

module caixa_eletronica() { caixa(placa_comp, placa_larg, placa_alt); }


// ============================================================
// PEÇA 4 — BERÇO DE APOIO
// Imprima DOIS. O rasgo em cima abraça a barriga do tambor,
// para ele não rolar na mesa.
// ============================================================
berco_larg = 38;

// ── OS DOIS BERÇOS TÊM ALTURAS DIFERENTES ──
// É isso que INCLINA o tambor. Betoneira de verdade anda com o balão
// empinado, boca para cima e para trás — é a silhueta que faz qualquer
// pessoa reconhecer o caminhão de longe. Tambor deitado reto parece
// tanque de combustível.
//
// A diferença de 26 mm entre os dois dá uns 13 graus, que é a inclinação
// usual. Aumente os dois juntos se quiser o conjunto mais alto.
berco_alt_frente = 60;
berco_alt_tras   = 86;

module berco(altura) {
    difference() {
        translate([-berco_larg / 2, -34, 0])
            cube([berco_larg, 68, altura]);

        // Rasgo que abraça o tambor. Fica 1,5 mm mais largo que o raio de
        // propósito: com o tambor inclinado, ele encosta numa linha e não
        // numa superfície, e folga aqui evita forçar a peça.
        translate([-berco_larg / 2 - 1, 0, altura + tambor_r_max - 20])
            rotate([0, 90, 0])
                cylinder(h = berco_larg + 2, r = tambor_r_max + 1.5, $fn = 90);
    }
}

module berco_frente() { berco(berco_alt_frente); }
module berco_tras()   { berco(berco_alt_tras); }


// ============================================================
// PEÇA 5 — TAMBOR
// A peça grande. Imprime EM PÉ, com o fundo fechado na mesa e a
// boca para cima — assim não precisa de suporte nenhum.
//
// A ÁGUA NÃO FICA AQUI DENTRO. Ela fica numa garrafa PET ou pote
// plástico encaixado dentro do tambor, e a bomba submersa fica
// dentro dessa garrafa. O tambor é só a casca com cara de betoneira.
//
// Por causa disso, os três furos ficam TODOS DO MESMO LADO (+X), que
// é o lado virado para cima quando o tambor deita no berço:
//   sonda de umidade · sensor de temperatura · passagem da mangueira
//
// NENHUM deles precisa vedar. Não existe furo abaixo da linha da
// água — nem no tambor, nem na garrafa. Isso encerrou de uma vez o
// problema de peça impressa transpirar pelas camadas.
// ============================================================
module chapado(z, angulo, d_pad, saliencia) {
    // pad plano na parede curva, para a borracha ou a flange assentar
    rotate([0, 0, angulo])
        translate([0, 0, z])
            rotate([0, 90, 0])
                cylinder(d = d_pad, h = tambor_r_max + saliencia, $fn = 60);
}

module tambor() {
    difference() {
        union() {
            // casca
            difference() {
                rotate_extrude($fn = 140) polygon(points = perfil_externo);
                rotate_extrude($fn = 140) polygon(points = perfil_interno);
            }

            // cintas de reforço (enfeite, dá cara de betoneira)
            if (cintas) {
                translate([0, 0, 45])
                    rotate_extrude($fn = 140) translate([43.5, 0]) circle(d = 4.5, $fn = 24);
                translate([0, 0, 100])
                    rotate_extrude($fn = 140) translate([41, 0]) circle(d = 4.5, $fn = 24);
            }

            // chapados planos em volta dos furos, para os flanges assentarem
            chapado(z_umidade,  0, sonda_um_larg + 22, 3);
            chapado(z_temp,     0, sensor_temp_d + 22, 3);
            chapado(z_passagem, 0, passagem_comp + 16, 3);
        }

        // --- furo da sonda de umidade (+X) ---
        translate([0, 0, z_umidade])
            rotate([0, 90, 0])
                linear_extrude(height = tambor_r_max + 10)
                    square([sonda_um_esp + folga, sonda_um_larg + folga], center = true);

        // --- furo do sensor de temperatura (+X) ---
        translate([0, 0, z_temp])
            rotate([0, 90, 0])
                cylinder(d = sensor_temp_d + folga, h = tambor_r_max + 10, $fn = 48);

        // --- rasgo da passagem (+X) ---
        // Por aqui sobem a mangueira da bomba e o fio de energia dela.
        // Fica ACIMA da linha da água, então não veda nada: é só passagem.
        translate([0, 0, z_passagem])
            rotate([0, 90, 0])
                linear_extrude(height = tambor_r_max + 10)
                    square([passagem_larg, passagem_comp], center = true);
    }
}


// ============================================================
// PEÇAS DO CAMINHÃO — chassi, rodas e cabine
//
// Não são só enfeite:
//   chassi  — eleva o tambor. A água desce por gravidade do tambor até o
//             sensor de vazão e daí ao balde; sem altura, ela não anda.
//   cabine  — abriga o ESP do GPS. A antena precisa de céu e tem que ficar
//             longe do tambor cheio de água, que faz sombra de sinal.
//   rodas   — essas são enfeite mesmo, mas são baratas e rápidas.
//
// IMPRIMA POR ÚLTIMO. Se o tempo apertar, o tambor no berço já demonstra
// tudo; caminhão bonito sem demonstração não demonstra nada.
// ============================================================
chassi_comp = 210;   // CONFIRA A SUA MESA antes. Ender 3 = 220 mm.
chassi_larg = 86;
chassi_esp  = 5;     // espessura do piso
long_alt    = 16;    // altura das longarinas, onde ficam os eixos

eixo_d      = 4;     // diâmetro do eixo (vareta de churrasco = ~3 mm)
roda_d      = 42;
roda_larg   = 18;

// Onde cada eixo atravessa, medido da frente do chassi
eixos_x = [46, 150, 182];

// Onde cada berço encaixa no piso, medido da frente.
// Os encaixes são REBAIXOS rasos, não pinos: pino exige acerto de folga e
// pode não entrar; rebaixo perdoa meio milímetro e ainda posiciona a peça
// sozinha na hora de colar.
berco_x_frente = 96;
berco_x_tras   = 186;

module chassi() {
    difference() {
        union() {
            // piso, onde os berços e a cabine são colados
            translate([0, 0, long_alt])
                cube([chassi_comp, chassi_larg, chassi_esp]);

            // longarinas: dão altura e seguram os eixos
            cube([chassi_comp, 6, long_alt]);
            translate([0, chassi_larg - 6, 0])
                cube([chassi_comp, 6, long_alt]);

            // travessa na frente, onde a cabine assenta
            translate([0, 0, long_alt - 4])
                cube([56, chassi_larg, 4]);
        }

        // furos dos eixos, atravessando as duas longarinas
        for (x = eixos_x)
            translate([x, -1, long_alt / 2])
                rotate([-90, 0, 0])
                    cylinder(d = eixo_d + folga, h = chassi_larg + 2, $fn = 30);

        // rebaixos de encaixe dos berços, 1,5 mm de profundidade
        for (x = [berco_x_frente, berco_x_tras])
            translate([x - berco_larg / 2 - folga,
                       (chassi_larg - 68) / 2 - folga,
                       long_alt + chassi_esp - 1.5])
                cube([berco_larg + folga * 2, 68 + folga * 2, 2]);
    }
}


// ── PARA-LAMA ──
// Meia-argola por cima da roda. Imprime DEITADA, sem suporte nenhum, e cola
// na lateral da longarina. É a peça que mais entrega "caminhão" por minuto
// de impressão: 15 minutos cada e muda a silhueta inteira.
module paralama() {
    re = roda_d / 2 + 9;
    ri = roda_d / 2 + 3;

    difference() {
        linear_extrude(height = roda_larg + 6)
            difference() {
                circle(r = re, $fn = 80);
                circle(r = ri, $fn = 80);
            }

        // corta a metade de baixo: para-lama é só a parte de cima
        translate([-re - 2, -re - 2, -1])
            cube([re * 2 + 4, re + 2, roda_larg + 8]);
    }
}


module roda() {
    difference() {
        cylinder(d = roda_d, h = roda_larg, $fn = 72);

        // furo do eixo
        translate([0, 0, -1])
            cylinder(d = eixo_d + folga, h = roda_larg + 2, $fn = 30);

        // rebaixo do aro nos dois lados, para não parecer um disco maciço
        translate([0, 0, -0.5])
            cylinder(d = roda_d - 12, h = 3, $fn = 60);
        translate([0, 0, roda_larg - 2.5])
            cylinder(d = roda_d - 12, h = 3, $fn = 60);

        // sulcos do pneu
        for (i = [1 : 3])
            translate([0, 0, i * roda_larg / 4 - 0.75])
                difference() {
                    cylinder(d = roda_d + 2, h = 1.5, $fn = 72);
                    cylinder(d = roda_d - 2, h = 1.5, $fn = 72);
                }
    }
}


// ── CABINE ──
// Perfil visto de lado: frente baixa (capô), para-brisa inclinado, teto.
// Extrudado na largura. Oca e ABERTA EMBAIXO — o ESP do GPS entra por baixo
// e a antena fica encostada no teto, que é fino de propósito.
// Agora que GPS e sensores dividem a mesma protoplaca, a cabine ficou
// DECORATIVA — não abriga mais nada. É a primeira peça a cortar se o tempo
// apertar: são 4 a 6 h de impressão que não mudam nada de funcional.
cab_comp = 62;
cab_larg = 80;
cab_alt  = 64;

raio_canto = 7;    // arredondamento das quinas verticais
cab_par    = 2.2;  // parede

// Planta da cabine com as quatro quinas arredondadas.
// Quina viva é o que mais denuncia peça improvisada — caminhão de verdade
// não tem aresta afiada em lugar nenhum da cabine.
module planta_cab(encolher = 0) {
    translate([raio_canto, raio_canto])
        offset(r = raio_canto - encolher, $fn = 40)
            square([cab_comp - raio_canto * 2, cab_larg - raio_canto * 2]);
}

module cabine() {
    difference() {
        union() {
            // ── CORPO ──
            // hull entre o bloco inteiro e uma fatia fina menor lá em cima:
            // isso arredonda o teto em volta, como cabine de caminhão.
            hull() {
                linear_extrude(height = cab_alt - 9) planta_cab();
                translate([0, 0, cab_alt - 0.1])
                    linear_extrude(height = 0.1) planta_cab(5);
            }

            // ── QUEBRA-SOL ──
            // A abinha sobre o para-brisa. É o detalhe mais característico
            // de caminhão e custa 3 mm de plástico.
            translate([-5, 7, cab_alt * 0.80])
                rotate([0, -7, 0])
                    cube([11, cab_larg - 14, 3.4]);

            // ── ESTRIBO ──
            // Degrau embaixo da porta, os dois lados.
            for (y = [-3.5, cab_larg])
                translate([cab_comp * 0.34, y, 7])
                    cube([26, 3.5, 3]);
        }

        // cavidade interna, aberta embaixo
        translate([0, 0, -1])
            linear_extrude(height = cab_alt - cab_par + 1)
                planta_cab(cab_par);

        // ── PARA-BRISA ──
        // Vazado de verdade, não desenhado. Se quiser vidro, cole um pedaço
        // de embalagem plástica transparente por dentro.
        translate([-2, 11, cab_alt * 0.46])
            cube([cab_par + 4, cab_larg - 22, cab_alt * 0.32]);

        // ── JANELAS DAS PORTAS ──
        for (y = [-2, cab_larg - cab_par - 2])
            translate([cab_comp * 0.32, y, cab_alt * 0.50])
                cube([cab_comp * 0.42, cab_par + 4, cab_alt * 0.26]);

        // ── RECORTE DAS PORTAS ──
        // Sulcos rasos: a linha da porta e a maçaneta.
        for (y = [-0.1, cab_larg - 1.1]) {
            translate([cab_comp * 0.30, y, 9])
                cube([1.2, 1.2, cab_alt * 0.62]);
            translate([cab_comp * 0.80, y, 9])
                cube([1.2, 1.2, cab_alt * 0.62]);
            translate([cab_comp * 0.30, y, cab_alt * 0.44])
                cube([cab_comp * 0.50, 1.2, 1.2]);
            translate([cab_comp * 0.70, y, cab_alt * 0.40])
                cube([8, 1.4, 2.2]);
        }

        // ── GRADE ──
        translate([-0.1, 13, cab_alt * 0.14])
            cube([2.2, cab_larg - 26, cab_alt * 0.20]);

        // ── FARÓIS ──
        for (y = [17, cab_larg - 17])
            translate([-0.1, y, cab_alt * 0.10])
                rotate([0, 90, 0])
                    cylinder(d = 11, h = 2.4, $fn = 40);
    }
}


// ── RETROVISOR ──
// Peça separada, IMPRIMA DOIS. Deitada na mesa ela sai forte e sem suporte;
// modelada junto da cabine sairia em pé, frágil, e quebraria na montagem.
// Cola na lateral, na altura do para-brisa.
module retrovisor() {
    // braço
    cube([26, 4, 3.4]);
    // espelho
    translate([22, 0, 0])
        cube([4, 4, 20]);
}


// ============================================================
// RENDERIZAÇÃO
// ============================================================
if (parte == "teste_furos")         teste_furos();
else if (parte == "flange_umidade") flange_umidade();
else if (parte == "flange_temp")    flange_temp();
else if (parte == "caixa")          caixa_eletronica();
else if (parte == "calha")          calha();
else if (parte == "berco_frente")   berco_frente();
else if (parte == "berco_tras")     berco_tras();
else if (parte == "paralama")       paralama();
else if (parte == "tambor")         tambor();
else if (parte == "chassi")         chassi();
else if (parte == "roda")           roda();
else if (parte == "cabine")         cabine();
else if (parte == "retrovisor")     retrovisor();
else {
    // "tudo" — só para ver o conjunto. NÃO exporte assim:
    // exporte uma peça de cada vez.
    tambor();
    translate([120,  95, 0])  berco_frente();
    translate([170,  95, 0])  berco_tras();
    translate([220,  95, 0])  paralama();
    translate([140,   0, 0])  caixa_eletronica();
    translate([120, -70, 0])  flange_umidade();
    translate([175, -70, 0])  flange_temp();
    translate([220,  60, 0])  calha();
    translate([-60, -70, 0])  teste_furos();
    translate([-60, 160, 0])  chassi();
    translate([-60,  95, 0])  roda();
    translate([ 20,  95, 0])  cabine();
    translate([ 20, 200, 0])  retrovisor();
}
