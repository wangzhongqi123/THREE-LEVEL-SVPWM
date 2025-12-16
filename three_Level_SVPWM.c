#include "three_Level_SVPWM.h"

//svpwm->Udc暂时没有用到
//不要用PPP NNN这种强零矢量！ 共模电压不达标(Udc/2)
//后续配合epwm模块使用,然后再写一个驱动函数,专门把七段式时间分配成为epwm的比较值
void THREE_LEVEL_SVPWM_PROCESS(SVPWM_structure* svpwm, float m, float angle)
{

    float Udc = svpwm->Udc;
    (void)Udc;
    float Ts = svpwm->Ts;

    //防止Q15溢出
    const float epsilon = 0.000001f;
    if(angle >= two_pi - epsilon) angle = 0.0f;

    float Vref_pu = m  * inv_SQRT_3;
    //这两行三角函数最后要替换成TMU的内联汇编函数
    float Valpha_pu = Vref_pu * __cos(angle);
    float Vbeta_pu  = Vref_pu * __sin(angle);

    //向上取整的模过些日子看看dsp手册,看看有没有内联汇编函数可以用
    //暂时就是先用定点数除法处理
    int16_t angle_pu_q15 = FLOAT_TO_Q15(angle * inv_2pi);
    int16_t Major_Sector = (angle_pu_q15 + d2r60pu_q15 - 1) / d2r60pu_q15; //计算扇区1~6
    Major_Sector = (Major_Sector == 0) ? 1 : Major_Sector;
    Major_Sector = (Major_Sector > 6) ? 6 : Major_Sector; 

    float angle_in_sector1 = angle - (Major_Sector - 1) * pi_DIV_3;  // 计算当前角度在小扇区内的偏移

    int16_t Minor_Sector = 0;
    //小于30°以内,Vref只能落在1,3,5号小扇区
    if(angle_in_sector1 <= pi_DIV_6)
    {
        if(Vbeta_pu <= (-(SQRT_3)*Valpha_pu + (SQRT_3_DIV_3)))
        {   
            Minor_Sector = 1;
        }
        else if(Vbeta_pu <= ((SQRT_3)*Valpha_pu - (SQRT_3_DIV_3)))
        {
            Minor_Sector = 5;
        }
        else    
        {
            Minor_Sector = 3;
        }
    }   
    //大于30°时,Vref只能落在2,4,6号小扇区
    else
    {
        if(Vbeta_pu <= (-(SQRT_3)*Valpha_pu + (SQRT_3_DIV_3)))
        {
            Minor_Sector = 2;
        }
        else if(Vbeta_pu >= SQRT_3_DIV_6)
        {
            Minor_Sector = 6;
        }
        else    
        {
            Minor_Sector = 4;
        }
    }

    // 计算出各个小扇区的占空比（Ta, Tb, Tc），这些是对应不同时间段的电压矢量时间。
    // 但还没有将这些占空比映射到具体的七段式开关状态时间。 
    // 下一步是将这些时间映射到具体的开关状态（PPO, OON 等）。
    float Ta, Tb, Tc;
    switch(Minor_Sector){

        case 1:
        case 2:
            Ta = 2*m*Ts*__sin(angle_in_sector1);
            Tb = Ts - 2*m*Ts*__sin(pi_DIV_3+angle_in_sector1);
            Tc = 2*m*Ts*__sin(pi_DIV_3-angle_in_sector1);
        break;

        case 3:
        case 4:  
            Ta = Ts - 2*m*Ts*__sin(angle_in_sector1);
            Tb = -Ts + 2*m*Ts*__sin(pi_DIV_3+angle_in_sector1);
            Tc = Ts - 2*m*Ts*__sin(pi_DIV_3-angle_in_sector1);
        break;

        case 5:
            Ta = 2*m*Ts*__sin(angle_in_sector1);
            Tb = 2*Ts - 2*m*Ts*__sin(pi_DIV_3+angle_in_sector1);
            Tc = -Ts + 2*m*Ts*__sin(pi_DIV_3-angle_in_sector1);
        break;

        case 6:  
            Ta = -Ts + 2*m*Ts*__sin(angle_in_sector1);
            Tb = 2*Ts - 2*m*Ts*__sin(pi_DIV_3+angle_in_sector1);
            Tc = 2*m*Ts*__sin(pi_DIV_3-angle_in_sector1);
        break;
    }

    //如果确实启用中点平衡算法,那么编译时候才调用这个函数 否则空函数都不调用
    #ifdef ENABLE_NEUTRAL_POINT_BALANCE
    THREE_LEVEL_SVPWM_NEUTRAL_POINT_BALANCE(svpwm);
    #endif //ENABLE_NEUTRAL_POINT_BALANCE

    //调用这个函数去分配七段式的时间和状态
    THREE_LEVEL_SVPWM_TimeState_Allocation_TimeAndState(svpwm, Major_Sector, Minor_Sector, Ta, Tb, Tc);

}


//六个大扇区 每个大扇区对应六个小扇区 用来分配七段式开馆状态序列对应的时间
//每相四个开关13互补 24互补 14不同时导通
//P 1100    O 0110    N 0011
//01 10|01 10|01 10|11 00|01 10|01 10|01 10
//00 11|01 10|01 10|01 10|01 10|01 10|00 11
//T1/4, T2/2, T3/2, T1/2, T3/2, T2/2, T1/4
//这个函数经过实测，占用的空间非常大,必须改成查表法,这个马上就改
void THREE_LEVEL_SVPWM_TimeState_Allocation_TimeAndState(SVPWM_structure* svpwm, int16_t Major_Sector, 
                                                         int16_t Minor_Sector, float Ta, float Tb, float Tc)
{
    switch (Major_Sector)
    {
        //I
        case 1:
            switch (Minor_Sector)
            {
                //I1    T1, T2, T3 分别是Tc, Ta, Tb 
                //三相半桥的状态分别是ONN OON OOO POO OOO OON ONN
                case 1:
                SET_7SEG_TIME(svpwm, Tc, Ta, Tb);
                SET_7SEG_STATE(svpwm->A_PHASE_STATE, O, O, O, P, O, O, O);
                SET_7SEG_STATE(svpwm->B_PHASE_STATE, N, O, O, O, O, O, N);
                SET_7SEG_STATE(svpwm->C_PHASE_STATE, N, N, O, O, O, N, N);
                break;

                //I2    T1, T2, T3 分别是Ta, Tb, Tc 
                //三相半桥的状态分别是OON OOO POO PPO POO OOO OON
                case 2:
                SET_7SEG_TIME(svpwm, Ta, Tb, Tc);
                SET_7SEG_STATE(svpwm->A_PHASE_STATE, O, O, P, P, P, O, O);
                SET_7SEG_STATE(svpwm->B_PHASE_STATE, O, O, O, P, O, O, O);
                SET_7SEG_STATE(svpwm->C_PHASE_STATE, N, O, O, O, O, O, N);
                break;

                //I3    T1, T2, T3 分别是Ta, Tc, Tb
                //三相半桥的状态分别是ONN OON PON POO PON OON ONN 
                case 3:
                SET_7SEG_TIME(svpwm, Ta, Tc, Tb);
                SET_7SEG_STATE(svpwm->A_PHASE_STATE, O, O, P, P, P, O, O);
                SET_7SEG_STATE(svpwm->B_PHASE_STATE, N, O, O, O, O, O, N);
                SET_7SEG_STATE(svpwm->C_PHASE_STATE, N, N, N, O, N, N, N);
                break;

                //I4    T1, T2, T3 分别是Tc, Tb, Ta
                //三相半桥的状态分别是OON PON POO PPO POO PON OON 
                case 4:
                SET_7SEG_TIME(svpwm, Tc, Tb, Ta);
                SET_7SEG_STATE(svpwm->A_PHASE_STATE, O, P, P, P, P, P, O);
                SET_7SEG_STATE(svpwm->B_PHASE_STATE, O, O, O, P, O, O, O);
                SET_7SEG_STATE(svpwm->C_PHASE_STATE, N, N, O, O, O, N, N);
                break;
                //b      c     a     b     a     c     b
                //T1/4, T2/2, T3/2, T1/2, T3/2, T2/2, T1/4
                //I5    T1, T2, T3 分别是Tb, Tc, Ta
                //三相半桥的状态分别是ONN PNN PON POO PON PNN ONN 
                case 5:
                SET_7SEG_TIME(svpwm, Tb, Tc, Ta);
                SET_7SEG_STATE(svpwm->A_PHASE_STATE, O, P, P, P, P, P, O);
                SET_7SEG_STATE(svpwm->B_PHASE_STATE, N, N, O, O, O, N, N);
                SET_7SEG_STATE(svpwm->C_PHASE_STATE, N, N, N, O, N, N, N);
                break;

                //I6    T1, T2, T3 分别是Tb, Tc, Ta
                //三相半桥的状态分别是OON PON PPN PPO PPN PON OON 
                case 6:
                SET_7SEG_TIME(svpwm, Tb, Tc, Ta);
                SET_7SEG_STATE(svpwm->A_PHASE_STATE, O, P, P, P, P, P, O);
                SET_7SEG_STATE(svpwm->B_PHASE_STATE, O, O, P, P, P, O, O);
                SET_7SEG_STATE(svpwm->C_PHASE_STATE, N, N, N, O, N, N, N);
                break;

            }
        break;
        
        //II
        case 2:
            switch (Minor_Sector) 
            {
                //II1   T1, T2, T3 分别是Tc, Tb, Ta
                //三相半桥的状态分别是OON OOO OPO PPO OPO OOO OON 
                case 1:
                SET_7SEG_TIME(svpwm, Tc, Tb, Ta);
                SET_7SEG_STATE(svpwm->A_PHASE_STATE, O, O, O, P, O, O, O);
                SET_7SEG_STATE(svpwm->B_PHASE_STATE, O, O, P, P, P, O, O);
                SET_7SEG_STATE(svpwm->C_PHASE_STATE, N, O, O, O, O, O, N);
                break;

                //II2   T1, T2, T3 分别是Ta, Tc, Tb
                //三相半桥的状态分别是NON OON OOO OPO OOO OON NON 
                case 2:
                SET_7SEG_TIME(svpwm, Ta, Tc, Tb);
                SET_7SEG_STATE(svpwm->A_PHASE_STATE, N, O, O, O, O, O, N);
                SET_7SEG_STATE(svpwm->B_PHASE_STATE, O, O, O, P, O, O, O);
                SET_7SEG_STATE(svpwm->C_PHASE_STATE, N, N, O, O, O, N, N);
                break;

                //II3    T1, T2, T3 分别是Ta, Tb, Tc 
                //三相半桥的状态分别是OON OPN OPO PPO OPO OPN OON
                case 3:
                SET_7SEG_TIME(svpwm, Ta, Tb, Tc);
                SET_7SEG_STATE(svpwm->A_PHASE_STATE, O, O, O, P, O, O, O);
                SET_7SEG_STATE(svpwm->B_PHASE_STATE, O, P, P, P, P, P, O);
                SET_7SEG_STATE(svpwm->C_PHASE_STATE, N, N, O, O, O, N, N);
                break;

                //II4    T1, T2, T3 分别是Tc, Ta, Tb 
                //三相半桥的状态分别是NON OON OPN OPO OPN OON NON
                case 4:
                SET_7SEG_TIME(svpwm, Tc, Ta, Tb);
                SET_7SEG_STATE(svpwm->A_PHASE_STATE, N, O, O, O, O, O, N);
                SET_7SEG_STATE(svpwm->B_PHASE_STATE, O, O, P, P, P, O, O);
                SET_7SEG_STATE(svpwm->C_PHASE_STATE, N, N, N, O, N, N, N);
                break;

                //II5   T1, T2, T3 分别是Tb, Ta, Tc 
                //三相半桥的状态分别是OON OPN PPN PPO PPN OPN OON
                case 5:
                SET_7SEG_TIME(svpwm, Tb, Ta, Tc);
                SET_7SEG_STATE(svpwm->A_PHASE_STATE, O, O, P, P, P, O, O);
                SET_7SEG_STATE(svpwm->B_PHASE_STATE, O, P, P, P, P, P, O);
                SET_7SEG_STATE(svpwm->C_PHASE_STATE, N, N, N, O, N, N, N);
                break;

                //II6   T1, T2, T3 分别是Tb, Ta, Tc 
                //三相半桥的状态分别是NON NPN OPN OPO OPN NPN NON
                case 6:
                SET_7SEG_TIME(svpwm, Tb, Ta, Tc);
                SET_7SEG_STATE(svpwm->A_PHASE_STATE, N, N, O, O, O, N, N);
                SET_7SEG_STATE(svpwm->B_PHASE_STATE, O, P, P, P, P, P, O);
                SET_7SEG_STATE(svpwm->C_PHASE_STATE, N, N, N, O, N, N, N);
                break;
                
            }
        break;

        //III
        case 3:
            switch (Minor_Sector) 
            {
                //III1   T1, T2, T3 分别是Tc, Ta, Tb 
                //三相半桥的状态分别是NON NOO OOO OPO OOO NOO NON
                case 1:
                SET_7SEG_TIME(svpwm, Tc, Ta, Tb);
                SET_7SEG_STATE(svpwm->A_PHASE_STATE, N, N, O, O, O, N, N);
                SET_7SEG_STATE(svpwm->B_PHASE_STATE, O, O, O, P, O, O, O);
                SET_7SEG_STATE(svpwm->C_PHASE_STATE, N, O, O, O, O, O, N);
                break;

                //III2    T1, T2, T3 分别是Ta, Tb, Tc 
                //三相半桥的状态分别是NOO OOO OPO OPP OPO OOO NOO
                case 2:
                SET_7SEG_TIME(svpwm, Ta, Tb, Tc);
                SET_7SEG_STATE(svpwm->A_PHASE_STATE, N, O, O, O, O, O, N);
                SET_7SEG_STATE(svpwm->B_PHASE_STATE, O, O, P, P, P, O, O);
                SET_7SEG_STATE(svpwm->C_PHASE_STATE, O, O, O, P, O, O, O);
                break;

                //III3   T1, T2, T3 分别是Ta, Tc, Tb
                //三相半桥的状态分别是NON NOO NPO OPO NPO NOO NON 
                case 3:
                SET_7SEG_TIME(svpwm, Ta, Tc, Tb);
                SET_7SEG_STATE(svpwm->A_PHASE_STATE, N, N, N, O, N, N, N);
                SET_7SEG_STATE(svpwm->B_PHASE_STATE, O, O, P, P, P, O, O);
                SET_7SEG_STATE(svpwm->C_PHASE_STATE, N, O, O, O, O, O, N);
                break;

                //III4   T1, T2, T3 分别是Tc, Tb, Ta
                //三相半桥的状态分别是NOO NPO OPO OPP OPO NPO NOO 
                case 4:
                SET_7SEG_TIME(svpwm, Tc, Tb, Ta);
                SET_7SEG_STATE(svpwm->A_PHASE_STATE, N, N, O, O, O, N, N);
                SET_7SEG_STATE(svpwm->B_PHASE_STATE, O, P, P, P, P, P, O);
                SET_7SEG_STATE(svpwm->C_PHASE_STATE, O, O, O, P, O, O, O);
                break;

                //III5   T1, T2, T3 分别是Tb, Tc, Ta
                //三相半桥的状态分别是NON NPN NPO OPO NPO NPN NON 
                case 5:
                SET_7SEG_TIME(svpwm, Tb, Tc, Ta);
                SET_7SEG_STATE(svpwm->A_PHASE_STATE, N, N, N, O, N, N, N);
                SET_7SEG_STATE(svpwm->B_PHASE_STATE, O, P, P, P, P, P, O);
                SET_7SEG_STATE(svpwm->C_PHASE_STATE, N, N, O, O, O, N, N);
                break;

                //III6   T1, T2, T3 分别是Tb, Tc, Ta
                //三相半桥的状态分别是NOO NPO NPP OPP NPP NPO NOO 
                case 6:
                SET_7SEG_TIME(svpwm, Tb, Tc, Ta);
                SET_7SEG_STATE(svpwm->A_PHASE_STATE, N, N, N, O, N, N, N);
                SET_7SEG_STATE(svpwm->B_PHASE_STATE, O, P, P, P, P, P, O);
                SET_7SEG_STATE(svpwm->C_PHASE_STATE, O, O, P, P, P, O, O);
                break;

            }
        break;

        //IV
        case 4:
            switch (Minor_Sector) 
            {
                //IV1   T1, T2, T3 分别是Tc, Tb, Ta
                //三相半桥的状态分别是NOO OOO OOP OPP OOP OOO NOO 
                case 1:
                SET_7SEG_TIME(svpwm, Tc, Tb, Ta);
                SET_7SEG_STATE(svpwm->A_PHASE_STATE, N, O, O, O, O, O, N);
                SET_7SEG_STATE(svpwm->B_PHASE_STATE, O, O, O, P, O, O, O);
                SET_7SEG_STATE(svpwm->C_PHASE_STATE, O, O, P, P, P, O, O);
                break;

                //IV2   T1, T2, T3 分别是Ta, Tc, Tb
                //三相半桥的状态分别是NNO NOO OOO OOP OOO NOO NNO 
                case 2:
                SET_7SEG_TIME(svpwm, Ta, Tc, Tb);
                SET_7SEG_STATE(svpwm->A_PHASE_STATE, N, N, O, O, O, N, N);
                SET_7SEG_STATE(svpwm->B_PHASE_STATE, N, O, O, O, O, O, N);
                SET_7SEG_STATE(svpwm->C_PHASE_STATE, O, O, O, P, O, O, O);
                break;

                //IV3    T1, T2, T3 分别是Ta, Tb, Tc 
                //三相半桥的状态分别是NOO NOP OOP OPP OOP NOP NOO
                case 3:
                SET_7SEG_TIME(svpwm, Ta, Tb, Tc);
                SET_7SEG_STATE(svpwm->A_PHASE_STATE, N, N, O, O, O, N, N);
                SET_7SEG_STATE(svpwm->B_PHASE_STATE, O, O, O, P, O, O, O);
                SET_7SEG_STATE(svpwm->C_PHASE_STATE, O, P, P, P, P, P, O);
                break;

                //IV4   T1, T2, T3 分别是Tc, Ta, Tb 
                //三相半桥的状态分别是NNO NOO NOP OOP NOP NOO NNO
                case 4:
                SET_7SEG_TIME(svpwm, Tc, Ta, Tb);
                SET_7SEG_STATE(svpwm->A_PHASE_STATE, N, N, N, O, N, N, N);
                SET_7SEG_STATE(svpwm->B_PHASE_STATE, N, O, O, O, O, O, N);
                SET_7SEG_STATE(svpwm->C_PHASE_STATE, O, O, P, P, P, O, O);
                break;

                //IV5   T1, T2, T3 分别是Tb, Ta, Tc 
                //三相半桥的状态分别是NOO NOP NPP OPP NPP NOP NOO
                case 5:
                SET_7SEG_TIME(svpwm, Tb, Ta, Tc);
                SET_7SEG_STATE(svpwm->A_PHASE_STATE, N, N, N, O, N, N, N);
                SET_7SEG_STATE(svpwm->B_PHASE_STATE, O, O, P, P, P, O, O);
                SET_7SEG_STATE(svpwm->C_PHASE_STATE, O, P, P, P, P, P, O);
                break;

                //IV6   T1, T2, T3 分别是Tb, Ta, Tc 
                //三相半桥的状态分别是NNO NNP NOP OOP NOP NNP NNO
                case 6:
                SET_7SEG_TIME(svpwm, Tb, Ta, Tc);
                SET_7SEG_STATE(svpwm->A_PHASE_STATE, N, N, N, O, N, N, N);
                SET_7SEG_STATE(svpwm->B_PHASE_STATE, N, N, O, O, O, N, N);
                SET_7SEG_STATE(svpwm->C_PHASE_STATE, O, P, P, P, P, P, O);
                break;

            }
        break;

        //V
        case 5:
            switch (Minor_Sector)
            {
                //V1   T1, T2, T3 分别是Tc, Ta, Tb 
                //三相半桥的状态分别是NNO ONO OOO OOP OOO ONO NNO
                case 1:
                SET_7SEG_TIME(svpwm, Tc, Ta, Tb);
                SET_7SEG_STATE(svpwm->A_PHASE_STATE, N, O, O, O, O, O, N);
                SET_7SEG_STATE(svpwm->B_PHASE_STATE, N, N, O, O, O, N, N);
                SET_7SEG_STATE(svpwm->C_PHASE_STATE, O, O, O, P, O, O, O);
                break;

                //V2    T1, T2, T3 分别是Ta, Tb, Tc 
                //三相半桥的状态分别是ONO OOO OOP POP OOP OOO ONO
                case 2:
                SET_7SEG_TIME(svpwm, Ta, Tb, Tc);
                SET_7SEG_STATE(svpwm->A_PHASE_STATE, O, O, O, P, O, O, O);
                SET_7SEG_STATE(svpwm->B_PHASE_STATE, N, O, O, O, O, O, N);
                SET_7SEG_STATE(svpwm->C_PHASE_STATE, O, O, P, P, P, O, O);
                break;

                //V3   T1, T2, T3 分别是Ta, Tc, Tb
                //三相半桥的状态分别是NNO ONO ONP OOP ONP ONO NNO
                case 3:
                SET_7SEG_TIME(svpwm, Ta, Tc, Tb);
                SET_7SEG_STATE(svpwm->A_PHASE_STATE, N, O, O, O, O, O, N);
                SET_7SEG_STATE(svpwm->B_PHASE_STATE, N, N, N, O, N, N, N);
                SET_7SEG_STATE(svpwm->C_PHASE_STATE, O, O, P, P, P, O, O);
                break;

                //V4   T1, T2, T3 分别是Tc, Tb, Ta
                //三相半桥的状态分别是ONO ONP OOP POP OOP ONP ONO
                case 4:
                SET_7SEG_TIME(svpwm, Tc, Tb, Ta);
                SET_7SEG_STATE(svpwm->A_PHASE_STATE, O, O, O, P, O, O, O);
                SET_7SEG_STATE(svpwm->B_PHASE_STATE, N, N, O, O, O, N, N);
                SET_7SEG_STATE(svpwm->C_PHASE_STATE, O, P, P, P, P, P, O);
                break;

                //V5   T1, T2, T3 分别是Tb, Tc, Ta
                //三相半桥的状态分别是NNO NNP ONP OOP ONP NNP NNO
                case 5:
                SET_7SEG_TIME(svpwm, Tb, Tc, Ta);
                SET_7SEG_STATE(svpwm->A_PHASE_STATE, N, N, O, O, O, N, N);
                SET_7SEG_STATE(svpwm->B_PHASE_STATE, N, N, N, O, N, N, N);
                SET_7SEG_STATE(svpwm->C_PHASE_STATE, O, P, P, P, P, P, O);
                break;

                //V6   T1, T2, T3 分别是Tb, Tc, Ta
                //三相半桥的状态分别是ONO ONP PNP POP PNP ONP ONO
                case 6:
                SET_7SEG_TIME(svpwm, Tb, Tc, Ta);
                SET_7SEG_STATE(svpwm->A_PHASE_STATE, O, O, P, P, P, O, O);
                SET_7SEG_STATE(svpwm->B_PHASE_STATE, N, N, N, O, N, N, N);
                SET_7SEG_STATE(svpwm->C_PHASE_STATE, O, P, P, P, P, P, O);
                break;

            }
        break;

        //VI
        case 6:
            switch (Minor_Sector) 
            {
                //VI1    T1, T2, T3 分别是Tc, Tb, Ta
                //三相半桥的状态分别是ONO OOO POO POP POO OOO ONO
                case 1:
                SET_7SEG_TIME(svpwm, Tc, Tb, Ta);
                SET_7SEG_STATE(svpwm->A_PHASE_STATE, O, O, P, P, P, O, O);
                SET_7SEG_STATE(svpwm->B_PHASE_STATE, N, O, O, O, O, O, N);
                SET_7SEG_STATE(svpwm->C_PHASE_STATE, O, O, O, P, O, O, O);
                break;

                //VI2    T1, T2, T3 分别是Ta, Tc, Tb
                //三相半桥的状态分别是ONN ONO OOO POO OOO ONO ONN
                case 2:
                SET_7SEG_TIME(svpwm, Ta, Tc, Tb);
                SET_7SEG_STATE(svpwm->A_PHASE_STATE, O, O, O, P, O, O, O);
                SET_7SEG_STATE(svpwm->B_PHASE_STATE, N, N, O, O, O, N, N);
                SET_7SEG_STATE(svpwm->C_PHASE_STATE, N, O, O, O, O, O, N);
                break;

                //VI3    T1, T2, T3 分别是Ta, Tb, Tc 
                //三相半桥的状态分别是ONO PNO POO POP POO PNO ONO
                case 3:
                SET_7SEG_TIME(svpwm, Ta, Tb, Tc);
                SET_7SEG_STATE(svpwm->A_PHASE_STATE, O, P, P, P, P, P, O);
                SET_7SEG_STATE(svpwm->B_PHASE_STATE, N, N, O, O, O, N, N);
                SET_7SEG_STATE(svpwm->C_PHASE_STATE, O, O, O, P, O, O, O);
                break;

                //VI4    T1, T2, T3 分别是Tc, Ta, Tb 
                //三相半桥的状态分别是ONN ONO PNO POO PNO ONO ONN
                case 4:
                SET_7SEG_TIME(svpwm, Tc, Ta, Tb);
                SET_7SEG_STATE(svpwm->A_PHASE_STATE, O, O, P, P, P, O, O);
                SET_7SEG_STATE(svpwm->B_PHASE_STATE, N, N, N, O, N, N, N);
                SET_7SEG_STATE(svpwm->C_PHASE_STATE, N, O, O, O, O, O, N);
                break;

                //VI5   T1, T2, T3 分别是Tb, Ta, Tc 
                //三相半桥的状态分别是ONO PNO PNP POP PNP PNO ONO
                case 5:
                SET_7SEG_TIME(svpwm, Tb, Ta, Tc);
                SET_7SEG_STATE(svpwm->A_PHASE_STATE, O, P, P, P, P, P, O);
                SET_7SEG_STATE(svpwm->B_PHASE_STATE, N, N, N, O, N, N, N);
                SET_7SEG_STATE(svpwm->C_PHASE_STATE, O, O, P, P, P, O, O);
                break;

                //VI6   T1, T2, T3 分别是Tb, Ta, Tc 
                //三相半桥的状态分别是ONN PNN PNO POO PNO PNN ONN
                case 6:
                SET_7SEG_TIME(svpwm, Tb, Ta, Tc);
                SET_7SEG_STATE(svpwm->A_PHASE_STATE, O, P, P, P, P, P, O);
                SET_7SEG_STATE(svpwm->B_PHASE_STATE, N, N, N, O, N, N, N);
                SET_7SEG_STATE(svpwm->C_PHASE_STATE, N, N, O, O, O, N, N);
                break;

            }
        break;
    }

}                                                         



/*
小矢量对中点电流的影响分析                   中矢量对中点电流的影响分析

 小矢量序列    i_np                           中矢量序列    i_np
    ONN    |    ia                               PON    |    ib 
    PPO    |    ic                               OPN    |    ia
    NON    |    ib                               NPO    |    ic
    OPP    |    ia                               NOP    |    ib
    OPP    |    ia                               ONP    |    ia
    POP    |    ib                               PNO    |    ic
-----------------------  
    POO    |   -ia                       由于中矢量没有成对出现,因此无法利用中矢量分配
    OON    |   -ic                       来实现中点电位平衡,小矢量是成对出现的,所以中点
    OPO    |   -ib                       电位可以通过小矢量的分配来实现平衡.         
    NOO    |   -ia
    OOP    |   -ic
    ONO    |   -ib
*/
#ifdef ENABLE_NEUTRAL_POINT_BALANCE
void THREE_LEVEL_SVPWM_NEUTRAL_POINT_BALANCE(SVPWM_structure* svpwm)
{
    //TODO:1级中点平衡算法:写死k值加滞环控制
    //    :2级中点平衡算法:实时计算k值(PI补偿器)
}
#else
void THREE_LEVEL_SVPWM_NEUTRAL_POINT_BALANCE(SVPWM_structure* svpwm){(void)svpwm;}
#endif //ENABLE_NEUTRAL_POINT_BALANCE
