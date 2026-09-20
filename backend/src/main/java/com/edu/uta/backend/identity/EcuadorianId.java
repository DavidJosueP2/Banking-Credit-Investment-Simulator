package com.edu.uta.backend.identity;

public final class EcuadorianId {

    private EcuadorianId() {
    }

    public static boolean valid(String idNumber) {
        if (idNumber == null || !idNumber.matches("\\d{10}")) return false;
        int province = Integer.parseInt(idNumber.substring(0, 2));
        if (province < 1 || (province > 24 && province != 30)) return false;
        if (Character.getNumericValue(idNumber.charAt(2)) > 5) return false;
        int total = 0;
        for (int index = 0; index < 9; index++) {
            int digit = Character.getNumericValue(idNumber.charAt(index));
            if (index % 2 == 0) {
                digit *= 2;
                if (digit > 9) digit -= 9;
            }
            total += digit;
        }
        int checkDigit = (10 - (total % 10)) % 10;
        return checkDigit == Character.getNumericValue(idNumber.charAt(9));
    }
}
